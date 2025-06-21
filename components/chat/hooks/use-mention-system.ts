import { useState, useCallback, useEffect } from "react"
import { findMentionContext, insertMention, MentionData, extractMentionedPersonas } from "@/lib/utils/mention"

export function useMentionSystem(
  userInput: string,
  allPersonas: any[],
  primaryPersona: any,
  inputRef: React.RefObject<HTMLTextAreaElement | null>
) {
  const [showMentionDropdown, setShowMentionDropdown] = useState<boolean>(false)
  const [mentionSearchText, setMentionSearchText] = useState<string>("")
  const [cursorPosition, setCursorPosition] = useState<number>(0)
  const [mentionedPersonas, setMentionedPersonas] = useState<Array<{id: string, name: string}>>([])
  const [activePersona, setActivePersona] = useState(primaryPersona)

  // 현재 입력에서 멘션된 페르소나 추적 및 활성 페르소나 변경
  useEffect(() => {
    const mentionedIds = extractMentionedPersonas(userInput)
    const mentioned = mentionedIds.map(id => {
      const persona = allPersonas.find(p => p.id === id)
      return {
        id,
        name: persona?.persona_title || persona?.name || id
      }
    }).filter(p => p.name !== p.id) // 유효한 페르소나만 필터링
    
    setMentionedPersonas(mentioned)
    
    // 멘션된 페르소나가 있으면 첫 번째 페르소나를 활성 페르소나로 설정
    if (mentioned.length > 0) {
      const firstMentionedPersona = allPersonas.find(p => p.id === mentioned[0]?.id)
      if (firstMentionedPersona) {
        setActivePersona(firstMentionedPersona)
      }
    } else {
      // 멘션이 없으면 기본 페르소나로 복귀
      setActivePersona(primaryPersona)
    }
  }, [userInput, allPersonas, primaryPersona])

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const newCursorPosition = e.target.selectionStart || 0
    
    setCursorPosition(newCursorPosition)
    
    // 멘션 컨텍스트 확인
    const mentionContext = findMentionContext(newValue, newCursorPosition)
    
    if (mentionContext.isInMention) {
      setMentionSearchText(mentionContext.searchText)
      setShowMentionDropdown(true)
    } else {
      setShowMentionDropdown(false)
      setMentionSearchText("")
    }
    
    return newValue
  }, [])

  const handleMentionSelect = useCallback((mention: MentionData, currentText: string, setUserInput: React.Dispatch<React.SetStateAction<string>>) => {
    if (!inputRef.current) return
    
    const result = insertMention(currentText, cursorPosition, mention)
    setUserInput(result.newText)
    setShowMentionDropdown(false)
    setMentionSearchText("")
    
    // 커서 위치 업데이트
    const timeoutId = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.setSelectionRange(result.newCursorPosition, result.newCursorPosition)
      }
    }, 0)
    
    // 성능 최적화: cleanup 함수에서 타임아웃 정리
    return () => clearTimeout(timeoutId)
  }, [cursorPosition, inputRef])

  const removeMention = useCallback((personaId: string, currentText: string, setUserInput: React.Dispatch<React.SetStateAction<string>>) => {
    // 특정 페르소나의 멘션을 텍스트에서 제거
    const mentionPattern = new RegExp(`@\\[[^\\]]*\\]\\(${personaId}\\)`, 'g')
    const newText = currentText.replace(mentionPattern, '').trim()
    setUserInput(newText)
    
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [inputRef])

  return {
    showMentionDropdown,
    mentionSearchText,
    mentionedPersonas,
    activePersona,
    handleTextareaChange,
    handleMentionSelect,
    removeMention,
    setShowMentionDropdown
  }
}