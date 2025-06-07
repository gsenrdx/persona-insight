"use client"

import { useRef, useEffect, useCallback, useMemo, useState } from "react"
import { useChat, type Message } from "ai/react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, ThumbsUp, ThumbsDown, Copy, MessageSquareMore, X, ArrowDown } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { motion, AnimatePresence } from "framer-motion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ChatInterfaceProps {
  personaId: string
  personaData: any
}

// MISO 응답에서 오는 데이터 타입 정의
interface MisoStreamData {
  misoConversationId?: string;
  [key: string]: any;
}

// 확장된 메시지 타입 정의
interface ExtendedMessage extends Message {
  metadata?: {
    isFollowUpQuestion?: boolean;
    originalMessageId?: string;
    [key: string]: any;
  };
}

export default function ChatInterface({ personaId, personaData }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isClient, setIsClient] = useState(false)
  const [misoConversationId, setMisoConversationId] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [userInput, setUserInput] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const [showLoadingMsg, setShowLoadingMsg] = useState<boolean>(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [isCopied, setIsCopied] = useState<string | null>(null)
  const [repliedMessages, setRepliedMessages] = useState<Record<string, string>>({}) // 꼬리질문 관계 추적

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // 초기 메시지 설정
  useEffect(() => {
    setChatMessages([
      {
        id: "1",
        role: "assistant" as const,
        content: `안녕하세요! 저는 ${personaData.name}입니다. 무엇을 도와드릴까요?`,
        createdAt: new Date(),
      }
    ]);
  }, [personaData.name]);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [])

  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // 메시지 복사 함수
  const handleCopyMessage = useCallback((messageId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setIsCopied(messageId);
    setTimeout(() => {
      setIsCopied(null);
    }, 2000);
  }, []);

  // 메시지 꼬리질문 함수
  const handleReplyMessage = useCallback((message: Message) => {
    setReplyingTo(message);
    focusInput();
  }, [focusInput]);

  // 꼬리질문 취소 함수
  const cancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  // API 요청 처리 함수
  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!userInput.trim() || loading) return;
    
    let finalUserInput = userInput;
    const userMessageId = Date.now().toString();
    let isFollowUpQuestion = false;
    let originalMessageId = "";
    
    // 꼬리질문 모드인 경우, 원본 메시지 ID와 내용 저장
    if (replyingTo && replyingTo.role === "assistant") {
      isFollowUpQuestion = true;
      originalMessageId = replyingTo.id;
      
      // 원본 메시지에 대한 참조를 내부적으로 저장
      setRepliedMessages(prev => ({
        ...prev,
        [userMessageId]: originalMessageId
      }));
      
      // API 호출용 전체 입력 생성 (내부적으로만 사용)
      finalUserInput = `"${replyingTo.content.substring(0, 100)}${replyingTo.content.length > 100 ? '...' : ''}"에 대한 추가 질문: ${userInput}`;
    }
    
    const userMessage: Message = {
      id: userMessageId,
      role: "user",
      content: userInput, // 화면에 표시할 때는 사용자 입력만 보여줌
      createdAt: new Date(),
    };
    
    // UI에 사용자 메시지 추가
    setChatMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setIsStreaming(false);
    setShowLoadingMsg(true); // 로딩 메시지 박스 표시
    setReplyingTo(null); // 꼬리질문 상태 초기화
    
    console.log("대화 전송 - conversationId:", misoConversationId);
    
    try {
      // API에 보낼 메시지 생성
      const apiMessages = [...chatMessages];
      
      // 꼬리질문인 경우 API 메시지에 메타데이터 추가
      if (isFollowUpQuestion) {
        apiMessages.push({
          ...userMessage,
          content: finalUserInput,
          metadata: {
            isFollowUpQuestion: true,
            originalMessageId: originalMessageId
          }
        } as ExtendedMessage);
      } else {
        apiMessages.push(userMessage);
      }
      
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: apiMessages,
          personaData: {
            name: personaData.name,
            insight: personaData.insight,
            painPoint: personaData.painPoint,
            hiddenNeeds: personaData.hiddenNeeds,
            keywords: personaData.keywords || [],
            summary: personaData.summary || "",
            persona_character: personaData.persona_character || ""
          },
          conversationId: misoConversationId
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`);
      }
      
      // 스트림 처리
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullText = "";
      let assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "",
        createdAt: new Date(),
      };
      
      // 메시지 추가 및 스트리밍 시작
      setShowLoadingMsg(false); // 로딩 메시지 박스 숨김
      setChatMessages(prev => [...prev, assistantMessage]);
      setIsStreaming(true);
      
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (value) {
          const chunkText = decoder.decode(value, { stream: true });
          const lines = chunkText.split("\n").filter(line => line.trim() !== "");
          
          for (const line of lines) {
            // 데이터 파싱
            if (line.startsWith("0:")) {
              // 텍스트 응답
              const textContent = JSON.parse(line.slice(2));
              // 전체 응답 업데이트
              fullText += textContent;
              
              // UI 업데이트: 응답 메시지 내용 업데이트 (최적화)
              requestAnimationFrame(() => {
                setChatMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: fullText,
                  };
                  return updated;
                });
              });
            } else if (line.startsWith("2:")) {
              // 데이터 응답
              try {
                const dataArray = JSON.parse(line.slice(2));
                if (Array.isArray(dataArray)) {
                  dataArray.forEach(item => {
                    if (item && typeof item === "object" && "misoConversationId" in item) {
                      const newConvId = item.misoConversationId;
                      console.log("MISO 대화 ID 수신:", newConvId);
                      setMisoConversationId(newConvId);
                    }
                  });
                }
              } catch (e) {
                console.error("데이터 파싱 오류:", e);
              }
            }
          }
        }
      }
      
      scrollToBottom();
      setUserInput("");
    } catch (error) {
      console.error("API 요청 오류:", error);
      setShowLoadingMsg(false); // 오류 발생 시 로딩 메시지 박스 숨김
      // 오류 메시지 UI에 표시
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: "죄송합니다, 응답을 처리하는 중 오류가 발생했습니다.",
        createdAt: new Date(),
      }]);
    } finally {
      setLoading(false);
      setIsStreaming(false);
      // 응답 완료 후 입력창으로 포커스 이동
      setTimeout(() => {
        focusInput();
      }, 100);
    }
  };

  useEffect(() => {
    if (chatMessages.length > 0) {
      scrollToBottom();
    }
  }, [chatMessages, scrollToBottom]);

  // 대화 ID 변경 시 로그 출력 (디버깅용)
  useEffect(() => {
    if (misoConversationId) {
      console.log("대화 ID 상태 업데이트됨:", misoConversationId);
    }
  }, [misoConversationId]);

  // 이전 메시지 찾기 함수
  const getReplySourceMessage = useCallback((messageId: string) => {
    if (!repliedMessages[messageId]) return null;
    return chatMessages.find(msg => msg.id === repliedMessages[messageId]) || null;
  }, [chatMessages, repliedMessages]);

  return (
    <div className="flex flex-col h-full">
      {/* CSS 정의 */}
      <style jsx global>{`
        .animate-pulse-subtle {
          animation: pulse-subtle 2s infinite;
        }
        
        @keyframes pulse-subtle {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        
        .loading-dots {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .loading-dots div {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #6366f1;
          opacity: 0.6;
        }
        
        .loading-dots div:nth-child(1) {
          animation: dot-fade 1.4s ease-in-out 0s infinite;
        }
        
        .loading-dots div:nth-child(2) {
          animation: dot-fade 1.4s ease-in-out 0.2s infinite;
        }
        
        .loading-dots div:nth-child(3) {
          animation: dot-fade 1.4s ease-in-out 0.4s infinite;
        }
        
        @keyframes dot-fade {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
        
        .reply-chip {
          animation: slide-in 0.3s ease-out;
        }
        
        @keyframes slide-in {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .tooltip-copied {
          animation: fade-out 2s forwards;
        }
        
        @keyframes fade-out {
          0% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
        
        .replied-to-badge {
          animation: fade-in 0.3s ease-out;
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .action-message:hover {
          border-color: #818cf8;
        }
        
        .action-message:hover + .message-actions {
          opacity: 1;
        }
        
        .action-message:hover + .message-actions .border-dashed {
          border-color: #818cf8;
        }
      `}</style>
      
      <div className="flex-1 overflow-y-auto py-4 px-4 md:px-6 bg-zinc-50 dark:bg-zinc-900 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-4">
          <AnimatePresence initial={false}>
            {chatMessages.map((message) => {
              // 꼬리질문으로 답변한 메시지인지 확인
              const sourceMessage = message.role === "user" ? getReplySourceMessage(message.id) : null;
              
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mb-4`}
                >
                  <div 
                    className={`
                      flex max-w-[90%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"} 
                      items-end gap-2
                    `}
                  >
                    {message.role === "assistant" && (
                      <Avatar className="h-9 w-9 rounded-full flex-shrink-0 border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                        <AvatarImage src={personaData.image} alt={personaData.name} />
                        <AvatarFallback className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                          {personaData.name.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={`
                        group relative px-4 py-3 rounded-md text-sm 
                        ${message.role === "user" 
                          ? "bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-sm dark:bg-indigo-900/20 dark:text-indigo-100 dark:border-indigo-800/40" 
                          : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
                        }
                        ${isStreaming && message.id === chatMessages[chatMessages.length - 1].id && message.role === "assistant" 
                          ? "animate-pulse-subtle" 
                          : ""
                        }
                        ${message.role === "assistant" ? "action-message" : ""}
                      `}
                    >
                      {/* 꼬리질문 배지 */}
                      {sourceMessage && message.role === "user" && (
                        <div className="replied-to-badge mb-2 text-xs text-indigo-500 dark:text-indigo-300 p-2 bg-indigo-50/70 dark:bg-indigo-900/20 rounded-md border border-indigo-100 dark:border-indigo-800/30">
                          <p className="italic font-medium mb-1">* 아래 답변에 대한 꼬리 질문입니다</p>
                          <div className="pl-2 border-l-2 border-indigo-300 dark:border-indigo-600 py-1">
                            <span className="line-clamp-2 text-zinc-600 dark:text-zinc-300">
                              {sourceMessage.content}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      <div className="mt-1.5 flex justify-end items-center gap-1.5">
                        <p className={`text-[10px] ${message.role === "user" ? "text-indigo-500 dark:text-indigo-300/80" : "text-zinc-500 dark:text-zinc-400"}`}>
                          {isClient && message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ''}
                        </p>
                      </div>
                      
                      {/* 메시지 액션 버튼 - 어시스턴트 메시지에만 표시 */}
                      {message.role === "assistant" && (
                        <div className="message-actions absolute -right-[90px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1.5">
                          <button 
                            onClick={() => handleCopyMessage(message.id, message.content)}
                            className="text-xs px-3 py-1.5 rounded-sm bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 whitespace-nowrap shadow-sm transition-colors"
                          >
                            <Copy className="h-3 w-3" />
                            <span>{isCopied === message.id ? "복사됨" : "복사"}</span>
                          </button>
                          
                          <button 
                            onClick={() => handleReplyMessage(message)}
                            className="text-xs px-3 py-1.5 rounded-sm bg-white dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 flex items-center gap-1.5 whitespace-nowrap shadow-sm transition-colors"
                          >
                            <MessageSquareMore className="h-3 w-3" />
                            <span>꼬리질문</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* 로딩 메시지 박스 */}
          {showLoadingMsg && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex justify-start mb-4"
            >
              <div className="flex flex-row items-end gap-2">
                <Avatar className="h-9 w-9 rounded-full flex-shrink-0 border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                  <AvatarImage src={personaData.image} alt={personaData.name} />
                  <AvatarFallback className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                    {personaData.name.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="px-4 py-3 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <div className="loading-dots">
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-950">
        {/* 꼬리질문 중인 메시지 표시 */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-3xl mx-auto mb-2"
            >
              <div className="reply-chip bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/40 rounded-md p-2 pr-8 flex items-center relative overflow-hidden">
                <div className="flex-shrink-0 w-1 h-full max-h-6 bg-indigo-400 mr-2 rounded-full"></div>
                <div className="text-xs text-indigo-800 dark:text-indigo-200 font-medium truncate">
                  {replyingTo.content.substring(0, 100)}
                  {replyingTo.content.length > 100 ? '...' : ''}
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={cancelReply}
                  className="h-5 w-5 rounded-full absolute right-1 top-1/2 transform -translate-y-1/2 hover:bg-indigo-200 dark:hover:bg-indigo-800/40"
                >
                  <X className="h-3 w-3 text-indigo-500 dark:text-indigo-300" />
                  <span className="sr-only">취소</span>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative">
          <div className="relative flex items-center">
            <Input
              ref={inputRef}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={replyingTo ? "꼬리질문을 입력하세요..." : "메시지를 입력하세요..."}
              disabled={loading}
              className="pr-14 py-3 h-12 rounded-md bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent placeholder:text-zinc-400 dark:placeholder:text-zinc-500 shadow-sm transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (userInput.trim() && !loading) {
                    handleSendMessage(e as unknown as React.FormEvent<HTMLFormElement>);
                  }
                }
              }}
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={loading || !userInput.trim()}
              className="absolute right-1 h-10 w-10 rounded-md bg-indigo-500 text-white hover:bg-indigo-600 shadow-sm disabled:bg-indigo-400 disabled:shadow-none transition-all focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">전송</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
