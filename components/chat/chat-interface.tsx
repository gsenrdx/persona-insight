"use client"

import { useRef, useEffect, useCallback, useMemo, useState } from "react"
import { useChat, type Message } from "ai/react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, ThumbsUp, ThumbsDown, Copy, MessageSquareMore, X, ArrowDown, FileText, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { SummaryModal } from "@/components/chat/summary"



interface ChatInterfaceProps {
  personaId: string
  personaData: any
}

// MISO 응답에서 오는 데이터 타입 정의
interface MisoStreamData {
  misoConversationId?: string;
  [key: string]: any;
}

// 요약 데이터 타입 정의
interface ContentItem {
  content: string;
  quote: string;
  relevance: number;
}

interface Subtopic {
  title: string;
  content_items: ContentItem[];
}

interface Topic {
  id: string;
  title: string;
  color: string;
  subtopics: Subtopic[];
}

interface RootNode {
  text: string;
  subtitle: string;
}

interface SummaryData {
  title: string;
  summary: string;
  root_node: RootNode;
  main_topics: Topic[];
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
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false)
  const [summaryModalOpen, setSummaryModalOpen] = useState<boolean>(false)
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null)

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
  const handleCopyMessage = useCallback(async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(messageId);
      setTimeout(() => setIsCopied(null), 2000);
    } catch (err) {
      console.error('복사 실패:', err);
    }
  }, []);

  // 꼬리질문 기능
  const handleReplyMessage = useCallback((message: Message) => {
    setReplyingTo(message);
    focusInput();
  }, [focusInput]);

  const cancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);



  // MISO 스트리밍 처리 함수
  const processMisoStreaming = async (response: Response) => {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    
    // 어시스턴트 메시지 미리 생성 및 추가
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      createdAt: new Date(),
    };

    // 로딩 메시지 숨기고 빈 어시스턴트 메시지 추가
    setShowLoadingMsg(false);
    setChatMessages(prev => [...prev, assistantMessage]);
    setIsStreaming(true);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // MISO 원본 청크 디코딩
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // MISO SSE 메시지 파싱 (줄 단위)
        let lineEnd;
        while ((lineEnd = buffer.indexOf('\n')) !== -1) {
          const rawLine = buffer.slice(0, lineEnd).trim();
          buffer = buffer.slice(lineEnd + 1);
          
          if (!rawLine) continue;
          
          // MISO API data: 접두사 처리
          const dataLine = rawLine.startsWith('data: ') ? rawLine.slice(6) : rawLine;
          
          if (!dataLine || dataLine === '[DONE]') continue;
          
          try {
            const payload = JSON.parse(dataLine);
            
            // MISO conversation_id 처리
            if (payload.conversation_id && !misoConversationId) {
              setMisoConversationId(payload.conversation_id);
            }
            
            // MISO 이벤트별 처리 - agent_message만 스트리밍
            if (payload.event === 'agent_message' && typeof payload.answer === 'string') {
              const receivedText = payload.answer;
              
              // 빈 answer는 무시
              if (receivedText === "") continue;
              
              // 누적된 전체 텍스트인지 델타 텍스트인지 감지하여 처리
              setChatMessages(prev => {
                const updated = [...prev];
                const lastIndex = updated.length - 1;
                if (lastIndex >= 0 && updated[lastIndex].role === "assistant" && updated[lastIndex].id === assistantMessage.id) {
                  const currentContent = updated[lastIndex].content;
                  
                  // 받은 텍스트가 현재 텍스트로 시작하고 더 길다면, 누적된 전체 텍스트
                  if (receivedText.startsWith(currentContent) && receivedText.length > currentContent.length) {
                    updated[lastIndex] = {
                      ...updated[lastIndex],
                      content: receivedText,
                    };
                  } 
                  // 현재 텍스트가 받은 텍스트로 시작한다면, 이미 포함된 내용이므로 무시
                  else if (currentContent.startsWith(receivedText)) {
                    return prev; // 상태 업데이트 없음
                  }
                  // 그 외의 경우는 델타 텍스트로 추가
                  else {
                    updated[lastIndex] = {
                      ...updated[lastIndex],
                      content: currentContent + receivedText,
                    };
                  }
                }
                return updated;
              });
              
              // 스크롤 업데이트
              scrollToBottom();
            }
            
            // MISO message_end 이벤트 처리 (스트림 종료)
            else if (payload.event === 'message_end') {
              return; // 스트림 완료
            }
            
          } catch (parseError) {
            // JSON 파싱 실패는 무시
          }
        }
      }
      
    } catch (streamError) {
      throw streamError;
    }
  };

  // 메시지 전송 함수
  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!userInput.trim() || loading) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userInput.trim(),
      createdAt: new Date(),
    };

    // 꼬리질문인 경우 관계 추적
    if (replyingTo) {
      setRepliedMessages(prev => ({
        ...prev,
        [newUserMessage.id]: replyingTo.id
      }));
    }

    setChatMessages(prev => [...prev, newUserMessage]);
    setLoading(true);
    setIsStreaming(false);
    setShowLoadingMsg(true); // 로딩 메시지 박스 표시
    setReplyingTo(null); // 꼬리질문 상태 초기화

    try {
      // API에 보낼 메시지 생성
      const apiMessages = [...chatMessages];
      
      // 꼬리질문인 경우 API 메시지에 메타데이터 추가
      if (replyingTo) {
        apiMessages.push({
          ...newUserMessage,
          content: `"${replyingTo.content.substring(0, 100)}${replyingTo.content.length > 100 ? '...' : ''}"에 대한 추가 질문: ${newUserMessage.content}`,
          metadata: {
            isFollowUpQuestion: true,
            originalMessageId: replyingTo.id
          }
        } as ExtendedMessage);
      } else {
        apiMessages.push(newUserMessage);
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // MISO 스트리밍 처리
      await processMisoStreaming(response);

    } catch (error) {
      setShowLoadingMsg(false);
      
      // 기존 어시스턴트 메시지가 있다면 오류 메시지로 업데이트
      setChatMessages(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        
        if (lastIndex >= 0 && updated[lastIndex].role === "assistant" && !updated[lastIndex].content) {
          // 빈 어시스턴트 메시지를 오류 메시지로 교체
          updated[lastIndex] = {
            ...updated[lastIndex],
            content: "죄송합니다, 응답을 처리하는 중 오류가 발생했습니다. 다시 시도해 주세요.",
          };
        } else {
          // 새 오류 메시지 추가
          updated.push({
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "죄송합니다, 응답을 처리하는 중 오류가 발생했습니다. 다시 시도해 주세요.",
            createdAt: new Date(),
          });
        }
        
        return updated;
      });
    } finally {
      setLoading(false);
      setIsStreaming(false);
      setUserInput("");
      
      // 응답 완료 후 스크롤 및 포커스
      setTimeout(() => {
        scrollToBottom();
        focusInput();
      }, 200);
    }
  };

  useEffect(() => {
    if (chatMessages.length > 0) {
      scrollToBottom();
    }
  }, [chatMessages, scrollToBottom]);


  // 이전 메시지 찾기 함수
  const getReplySourceMessage = useCallback((messageId: string) => {
    if (!repliedMessages[messageId]) return null;
    return chatMessages.find(msg => msg.id === repliedMessages[messageId]) || null;
  }, [chatMessages, repliedMessages]);

  // 대화 요약 생성 함수
  const handleGenerateSummary = useCallback(async () => {
    if (chatMessages.length <= 1 || isGeneratingSummary) return; // 초기 메시지만 있으면 생성하지 않음
    
    setIsGeneratingSummary(true);
    
    try {
      // 현재 대화 내용 준비 (초기 인사 메시지 제외)
      const conversationContent = chatMessages
        .slice(1) // 첫 번째 인사 메시지 제외
        .map(msg => `${msg.role === 'user' ? '사용자' : personaData.name}: ${msg.content}`)
        .join('\n\n');

      // Supabase 세션에서 JWT 토큰 가져오기
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('로그인이 필요합니다.');
      }
      
      const response = await fetch('/api/chat/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          conversationContent,
          personaName: personaData.name,
          conversationId: misoConversationId
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '대화 요약 생성에 실패했습니다.');
      }
      
      const result = await response.json();
      
      if (result.success && result.summaryData) {
        let finalSummaryData = result.summaryData;
        
        // 서버에서 파싱에 실패한 경우 클라이언트에서 재시도
        if (result.summaryData.error === 'JSON 파싱 실패' && result.summaryData.raw) {
          try {
            let cleanedData = result.summaryData.raw.trim();
            
            // 마크다운 코드 블록 제거
            cleanedData = cleanedData.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
            cleanedData = cleanedData.replace(/^```\s*/, '').replace(/\s*```$/i, '');
            cleanedData = cleanedData.trim();
            
            if (cleanedData.startsWith('{') && cleanedData.endsWith('}')) {
              finalSummaryData = JSON.parse(cleanedData);
            }
          } catch (clientParseError) {
            console.error('클라이언트 파싱도 실패:', clientParseError);
            // 파싱 실패 시 원본 에러 정보 유지
          }
        }
        
        // 최종 데이터 확인
        if (finalSummaryData && !finalSummaryData.error) {
          setSummaryData(finalSummaryData);
          setSummaryModalOpen(true);
        } else {
          console.warn('대화 요약 데이터 처리 실패:', finalSummaryData);
          alert('대화 요약 생성은 완료되었지만 데이터 처리 중 문제가 발생했습니다.');
        }
      } else {
        throw new Error(result.error || '대화 요약 데이터를 처리할 수 없습니다.');
      }
      
    } catch (error) {
      console.error('대화 요약 생성 오류:', error);
      // 오류 토스트나 알림 표시
      alert(`대화 요약 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [chatMessages, personaData.name, misoConversationId, isGeneratingSummary]);

  return (
    <div className="flex flex-col h-full relative">
      {/* CSS 정의 */}
      <style jsx global>{`
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
                      <div className="h-9 w-9 rounded-full flex-shrink-0 border border-zinc-200 dark:border-zinc-700 overflow-hidden relative">
                        {personaData.image ? (
                          <Image
                            src={personaData.image}
                            alt={personaData.name}
                            width={36}
                            height={36}
                            className="object-cover w-full h-full"
                            unoptimized={personaData.image.includes('supabase.co')}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                            {personaData.name.substring(0, 2)}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div
                      className={`
                        group relative px-4 py-3 rounded-md text-sm 
                        ${message.role === "user" 
                          ? "bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-sm dark:bg-indigo-900/20 dark:text-indigo-100 dark:border-indigo-800/40" 
                          : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
                        }
                      `}
                    >
                      {/* 꼬리질문 배지 */}
                      {sourceMessage && message.role === "user" && (
                        <div className="mb-2 text-xs text-indigo-500 dark:text-indigo-300 p-2 bg-indigo-50/70 dark:bg-indigo-900/20 rounded-md border border-indigo-100 dark:border-indigo-800/30">
                          <p className="italic font-medium mb-1">* 아래 답변에 대한 꼬리 질문입니다</p>
                          <div className="pl-2 border-l-2 border-indigo-300 dark:border-indigo-600 py-1">
                            <span className="line-clamp-2 text-zinc-600 dark:text-zinc-300">
                              {sourceMessage.content}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
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
                <div className="h-9 w-9 rounded-full flex-shrink-0 border border-zinc-200 dark:border-zinc-700 overflow-hidden relative">
                  {personaData.image ? (
                    <Image
                      src={personaData.image}
                      alt={personaData.name}
                      width={36}
                      height={36}
                      className="object-cover w-full h-full"
                      unoptimized={personaData.image.includes('supabase.co')}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                      {personaData.name.substring(0, 2)}
                    </div>
                  )}
                </div>
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
              <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/40 rounded-md p-2 pr-8 flex items-center relative overflow-hidden">
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

      {/* AI 요약 생성 버튼 */}
      <AnimatePresence>
        {chatMessages.length > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-20 right-4 md:bottom-24 md:right-6 z-10"
          >
            <Button
              onClick={handleGenerateSummary}
              disabled={isGeneratingSummary || chatMessages.length <= 1}
              className={`
                px-4 py-2 h-10 rounded-lg bg-blue-600 
                hover:bg-blue-700 text-white text-sm font-medium shadow-md 
                border-0 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
                transition-colors duration-200
                ${isGeneratingSummary || chatMessages.length <= 1 ? 'opacity-60 cursor-not-allowed' : ''}
              `}
            >
              {isGeneratingSummary ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  AI 요약
                </>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 대화 요약 모달 */}
      <SummaryModal
        isOpen={summaryModalOpen}
        onClose={() => {
          setSummaryModalOpen(false);
          setSummaryData(null);
        }}
        summaryData={summaryData}
        personaName={personaData.name}
        personaImage={personaData.image}
      />
    </div>
  )
}
