import { useCallback, useRef, useState } from "react"
import { ExtendedMessage } from "../types"

export function useMisoStreaming() {
  const [misoConversationId, setMisoConversationId] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const [isUsingTool, setIsUsingTool] = useState<boolean>(false)
  const isUsingToolRef = useRef<boolean>(false)

  const processMisoStreaming = useCallback(async (
    response: Response,
    assistantMessage: ExtendedMessage,
    setChatMessages: React.Dispatch<React.SetStateAction<ExtendedMessage[]>>,
    scrollToBottom: () => void
  ) => {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    setIsStreaming(true)

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // MISO 원본 청크 디코딩
        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk
        
        // MISO SSE 메시지 파싱 (줄 단위)
        let lineEnd
        while ((lineEnd = buffer.indexOf('\n')) !== -1) {
          const rawLine = buffer.slice(0, lineEnd).trim()
          buffer = buffer.slice(lineEnd + 1)
          
          if (!rawLine) continue
          
          // MISO API data: 접두사 처리
          const dataLine = rawLine.startsWith('data: ') ? rawLine.slice(6) : rawLine
          
          if (!dataLine || dataLine === '[DONE]') continue
          
          try {
            const payload = JSON.parse(dataLine)
            
            // MISO conversation_id 처리
            if (payload.conversation_id && !misoConversationId) {
              setMisoConversationId(payload.conversation_id)
            }
            
            // MISO agent_thought 이벤트 처리 - 도구 사용 추적
            if (payload.event === 'agent_thought') {
              if (payload.tool && payload.tool !== '') {
                isUsingToolRef.current = true
                setIsUsingTool(true)
              } else if (payload.tool === '') {
                isUsingToolRef.current = false
                setIsUsingTool(false)
              }
            }
            
            // MISO 이벤트별 처리 - agent_message만 스트리밍
            else if (payload.event === 'agent_message' && typeof payload.answer === 'string') {
              const receivedText = payload.answer
              
              if (receivedText === "") continue
              
              // 도구 사용 중이 아닐 때만 메시지 업데이트
              if (!isUsingToolRef.current) {
                setChatMessages(prev => {
                  const updated = [...prev]
                  const lastIndex = updated.length - 1
                  if (lastIndex >= 0 && updated[lastIndex]?.role === "assistant" && updated[lastIndex]?.id === assistantMessage.id) {
                    const currentContent = updated[lastIndex]?.content || ''
                    
                    // 받은 텍스트가 현재 텍스트로 시작하고 더 길다면, 누적된 전체 텍스트
                    if (receivedText.startsWith(currentContent) && receivedText.length > currentContent.length) {
                      updated[lastIndex] = {
                        ...updated[lastIndex],
                        content: receivedText,
                      } as ExtendedMessage
                    } 
                    // 현재 텍스트가 받은 텍스트로 시작한다면, 이미 포함된 내용이므로 무시
                    else if (currentContent.startsWith(receivedText)) {
                      return prev
                    }
                    // 그 외의 경우는 델타 텍스트로 추가
                    else {
                      updated[lastIndex] = {
                        ...updated[lastIndex],
                        content: currentContent + receivedText,
                      } as ExtendedMessage
                    }
                  }
                  return updated
                })
                
                scrollToBottom()
              }
            }
            
            // MISO message_end 이벤트 처리 (스트림 종료)
            else if (payload.event === 'message_end') {
              isUsingToolRef.current = false
              setIsUsingTool(false)
              return
            }
            
          } catch (parseError) {
            // JSON 파싱 실패는 무시
          }
        }
      }
      
    } catch (streamError) {
      throw streamError
    } finally {
      // 성능 최적화: 메모리 누수 방지를 위한 reader 정리
      try {
        reader.releaseLock()
      } catch (e) {
        // reader가 이미 해제된 경우 무시
      }
      setIsStreaming(false)
    }
  }, [misoConversationId])

  return {
    misoConversationId,
    isStreaming,
    isUsingTool,
    isUsingToolRef,
    processMisoStreaming,
    setIsUsingTool
  }
}