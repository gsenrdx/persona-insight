'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { CleanedScriptItem } from '@/types/interview'
import { ScriptPresencePayload } from '@/lib/realtime/broadcast/types'
import { debounce } from 'lodash'
import { useAuth } from '@/hooks/use-auth'

// Utility functions for accurate cursor positioning
const getCaretCoordinates = (element: HTMLElement, offset: number) => {
  const range = document.createRange()
  const textNode = element.firstChild
  
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    return { x: 0, y: 0 }
  }
  
  // Ensure offset is within bounds
  const maxOffset = textNode.textContent?.length || 0
  const safeOffset = Math.min(Math.max(0, offset), maxOffset)
  
  range.setStart(textNode, safeOffset)
  range.collapse(true)
  
  const rect = range.getBoundingClientRect()
  const containerRect = element.getBoundingClientRect()
  
  return {
    x: rect.left - containerRect.left,
    y: rect.top - containerRect.top
  }
}

const getSelectionCoordinates = (element: HTMLElement, start: number, end: number) => {
  const range = document.createRange()
  const textNode = element.firstChild
  
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }
  
  const maxOffset = textNode.textContent?.length || 0
  const safeStart = Math.min(Math.max(0, start), maxOffset)
  const safeEnd = Math.min(Math.max(safeStart, end), maxOffset)
  
  range.setStart(textNode, safeStart)
  range.setEnd(textNode, safeEnd)
  
  const rect = range.getBoundingClientRect()
  const containerRect = element.getBoundingClientRect()
  
  return {
    x: rect.left - containerRect.left,
    y: rect.top - containerRect.top,
    width: rect.width,
    height: rect.height
  }
}

interface EditableScriptItemProps {
  item: CleanedScriptItem
  index: number
  isConsecutiveSameSpeaker: boolean
  presences: ScriptPresencePayload[]
  onEdit: (scriptId: string, text: string) => void
  onPresenceUpdate: (presence: Partial<ScriptPresencePayload>) => void
  userColor: string
  className?: string
}

export default function EditableScriptItem({
  item,
  index,
  isConsecutiveSameSpeaker,
  presences,
  onEdit,
  onPresenceUpdate,
  userColor,
  className
}: EditableScriptItemProps) {
  const { user, profile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [editingText, setEditingText] = useState(item.cleaned_sentence)
  const [editStatus, setEditStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'conflict'>('idle')
  const [currentUserPresence, setCurrentUserPresence] = useState<ScriptPresencePayload | null>(null)
  const contentEditableRef = useRef<HTMLDivElement>(null)
  const scriptId = item.id.join('-')
  
  // Create merged presences including current user when editing
  const activePresences = useMemo(() => {
    const otherPresences = presences.filter(p => 
      p.scriptId === scriptId && 
      p.userId !== user?.id && 
      (p.selectionCoords || p.cursorCoords || p.selection || p.cursorPosition !== undefined)
    )
    
    console.log('[EditableScript] Presences for script', scriptId, ':', {
      total: presences.length,
      otherUsers: otherPresences.length,
      currentUser: currentUserPresence,
      isEditing
    })
    
    // Always include current user presence when editing this script
    const currentUserInScript = currentUserPresence && 
      currentUserPresence.scriptId === scriptId && 
      isEditing
    
    return currentUserInScript 
      ? [...otherPresences, currentUserPresence]
      : otherPresences
  }, [presences, scriptId, user?.id, currentUserPresence, isEditing])
  
  // Debounced save function with status tracking
  const debouncedSave = useCallback(
    debounce(async (text: string) => {
      try {
        setEditStatus('saving')
        await onEdit(scriptId, text)
        setEditStatus('saved')
        
        // Clear saved status after a short delay
        setTimeout(() => {
          setEditStatus('idle')
        }, 1500)
      } catch (error) {
        setEditStatus('error')
        
        // Clear error status after 3 seconds
        setTimeout(() => {
          setEditStatus('idle')
        }, 3000)
      }
    }, 500),
    [scriptId, onEdit]
  )
  
  // Enhanced presence update with real-time selection tracking
  const lastPresenceRef = useRef<Partial<ScriptPresencePayload>>({})
  const selectionUpdateRef = useRef<NodeJS.Timeout | null>(null)
  
  const sendPresenceUpdate = useCallback((presence: Partial<ScriptPresencePayload>) => {
    // Clear any pending update
    if (selectionUpdateRef.current) {
      clearTimeout(selectionUpdateRef.current)
    }
    
    // Create full presence object for current user
    const fullPresence: ScriptPresencePayload = {
      userId: user?.id || '',
      userName: profile?.name || user?.email?.split('@')[0] || 'Unknown',
      avatarUrl: profile?.avatar_url || undefined,
      color: userColor,
      lastActiveAt: new Date().toISOString(),
      ...presence
    }
    
    // Update local current user presence state
    setCurrentUserPresence(fullPresence)
    
    // Send ALL updates immediately for ultra-responsive feeling
    onPresenceUpdate(presence)
    lastPresenceRef.current = { ...presence }
  }, [onPresenceUpdate, user, profile, userColor])
  
  // Super fast cursor update - no debounce for real-time feeling
  const fastCursorUpdate = useCallback((presence: Partial<ScriptPresencePayload>) => {
    // Send immediately, no debounce for maximum responsiveness
    onPresenceUpdate(presence)
    lastPresenceRef.current = { ...presence }
  }, [onPresenceUpdate])
  
  // Handle selection change for presence with accurate positioning
  useEffect(() => {
    if (!isEditing || !contentEditableRef.current) return
    
    const handleSelectionChange = () => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return
      
      const range = selection.getRangeAt(0)
      if (!contentEditableRef.current?.contains(range.commonAncestorContainer)) return
      
      // Get text offsets
      const cursorOffset = range.startOffset
      const hasSelection = !range.collapsed
      
      // Calculate actual pixel coordinates
      const cursorCoords = getCaretCoordinates(contentEditableRef.current, cursorOffset)
      
      const presenceUpdate: Partial<ScriptPresencePayload> = {
        scriptId,
        cursorPosition: cursorOffset,
        cursorCoords,
        selection: hasSelection ? {
          start: range.startOffset,
          end: range.endOffset
        } : undefined
      }
      
      // Add selection coordinates if there's a selection
      if (hasSelection) {
        const selectionCoords = getSelectionCoordinates(
          contentEditableRef.current, 
          range.startOffset, 
          range.endOffset
        )
        presenceUpdate.selectionCoords = selectionCoords
      }
      
      // Send ALL updates immediately for ultra-fast response
      sendPresenceUpdate(presenceUpdate)
    }
    
    // Additional keyboard event listeners for immediate feedback
    const handleKeyUp = () => {
      // Small delay to let selection settle
      setTimeout(handleSelectionChange, 10)
    }
    
    const handleMouseUp = () => {
      // Immediate selection update on mouse up
      handleSelectionChange()
    }
    
    document.addEventListener('selectionchange', handleSelectionChange)
    
    if (contentEditableRef.current) {
      contentEditableRef.current.addEventListener('keyup', handleKeyUp)
      contentEditableRef.current.addEventListener('mouseup', handleMouseUp)
    }
    
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
      if (contentEditableRef.current) {
        contentEditableRef.current.removeEventListener('keyup', handleKeyUp)
        contentEditableRef.current.removeEventListener('mouseup', handleMouseUp)
      }
      if (selectionUpdateRef.current) {
        clearTimeout(selectionUpdateRef.current)
      }
    }
  }, [isEditing, scriptId, sendPresenceUpdate])
  
  // Handle editing
  const handleClick = () => {
    if (!isEditing) {
      setIsEditing(true)
      
      // Immediately update presence to show user is editing this script
      sendPresenceUpdate({ 
        scriptId,
        lastActiveAt: new Date().toISOString()
      })
      
      // Focus and select all text
      setTimeout(() => {
        if (contentEditableRef.current) {
          contentEditableRef.current.focus()
          const range = document.createRange()
          range.selectNodeContents(contentEditableRef.current)
          const selection = window.getSelection()
          selection?.removeAllRanges()
          selection?.addRange(range)
          
          // Update presence with initial selection (select all)
          const cursorCoords = getCaretCoordinates(contentEditableRef.current, 0)
          sendPresenceUpdate({
            scriptId,
            cursorPosition: 0,
            cursorCoords,
            selection: {
              start: 0,
              end: contentEditableRef.current.innerText.length
            },
            selectionCoords: getSelectionCoordinates(
              contentEditableRef.current, 
              0, 
              contentEditableRef.current.innerText.length
            )
          })
        }
      }, 0)
    }
  }
  
  const handleBlur = () => {
    setIsEditing(false)
    
    // Clear current user presence state but keep other users' presence active
    setCurrentUserPresence(null)
    
    // Send presence clear to broadcast (delayed to allow other users to see final state)
    setTimeout(() => {
      sendPresenceUpdate({ 
        scriptId: undefined,
        cursorPosition: undefined,
        cursorCoords: undefined,
        selection: undefined,
        selectionCoords: undefined
      })
    }, 100)
    
    // Save final changes
    if (contentEditableRef.current) {
      const text = contentEditableRef.current.innerText
      if (text !== item.cleaned_sentence) {
        onEdit(scriptId, text)
      }
    }
  }
  
  const handleInput = () => {
    if (contentEditableRef.current) {
      const text = contentEditableRef.current.innerText
      setEditingText(text)
      debouncedSave(text)
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Cancel editing and restore original text
      if (contentEditableRef.current) {
        contentEditableRef.current.innerText = item.cleaned_sentence
      }
      setEditingText(item.cleaned_sentence)
      contentEditableRef.current?.blur()
    }
  }
  
  // Render other users' cursors and selections with accurate positioning
  const renderPresences = () => {
    if (!contentEditableRef.current) return null
    
    return (
      <>
        {/* Notion-style clean selection highlights and cursors */}
        {activePresences.map((presence) => {
          const { userId, userName, color, cursorCoords, selectionCoords, cursorPosition, selection } = presence
          
          return (
            <div key={`highlight-${userId}`} className="absolute inset-0 pointer-events-none">
              {/* Clean selection highlight */}
              {selectionCoords ? (
                <div
                  className="absolute transition-all duration-200 ease-out"
                  style={{
                    backgroundColor: `${color}20`,
                    left: `${selectionCoords.x}px`,
                    top: `${selectionCoords.y}px`,
                    width: `${selectionCoords.width}px`,
                    height: `${selectionCoords.height}px`,
                    borderRadius: '2px'
                  }}
                />
              ) : selection && (
                <div
                  className="absolute transition-all duration-200 ease-out"
                  style={{
                    backgroundColor: `${color}15`,
                    left: `${(selection.start / editingText.length) * 100}%`,
                    width: `${((selection.end - selection.start) / editingText.length) * 100}%`,
                    height: '100%',
                    borderRadius: '1px'
                  }}
                />
              )}
          
          {/* Clean cursor */}
          {cursorCoords ? (
            <div
              className="absolute transition-all duration-200 ease-out"
              style={{
                left: `${cursorCoords.x}px`,
                top: `${cursorCoords.y}px`,
                width: '1.5px',
                height: '1.2em',
                backgroundColor: color,
                borderRadius: '0.5px'
              }}
            >
              <div
                className="absolute inset-0 animate-pulse"
                style={{
                  backgroundColor: color,
                  borderRadius: '0.5px'
                }}
              />
            </div>
          ) : cursorPosition !== undefined && (
            <div
              className="absolute transition-all duration-200 ease-out"
              style={{
                left: `${(cursorPosition / editingText.length) * 100}%`,
                top: 0,
                bottom: 0,
                width: '1.5px',
                backgroundColor: color,
                borderRadius: '0.5px'
              }}
            />
          )}
        </div>
      )
    })}
    
    {/* Medium-style editing indicators - only show avatars */}
    {activePresences.length > 0 && (
      <div className="absolute -top-8 right-0 flex items-center gap-1 pointer-events-none z-30">
        <div className="flex -space-x-1">
          {activePresences.slice(0, 3).map((presence) => (
            <div
              key={presence.userId}
              className="w-6 h-6 rounded-full border-2 border-white shadow-sm overflow-hidden"
              style={{ backgroundColor: presence.color }}
              title={`${presence.userName}님이 편집 중`}
            >
              {presence.avatarUrl ? (
                <img 
                  src={presence.avatarUrl} 
                  alt={`${presence.userName} avatar`} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-xs font-medium flex items-center justify-center h-full">
                  {presence.userName?.charAt(0).toUpperCase() || '?'}
                </span>
              )}
            </div>
          ))}
          {activePresences.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center">
              <span className="text-xs text-gray-600 font-medium">+{activePresences.length - 3}</span>
            </div>
          )}
        </div>
        {activePresences.length === 1 && (
          <span className="ml-2 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow-sm">
            {activePresences[0].userName} 편집 중
          </span>
        )}
        {activePresences.length > 1 && (
          <span className="ml-2 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow-sm">
            {activePresences.length}명 편집 중
          </span>
        )}
      </div>
    )}
  </>
)
}
  
  return (
    <div
      className={cn(
        "group relative transition-all duration-150",
        isEditing && "bg-white/50",
        className
      )}
    >
      <div className="flex gap-3 group">
        {/* Notion-style minimal speaker indicator */}
        {!isConsecutiveSameSpeaker && (
          <div className="flex-shrink-0 w-6 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
            <div className={cn(
              "w-5 h-5 rounded-md flex items-center justify-center text-xs font-medium",
              item.speaker === 'question' 
                ? "bg-blue-50 text-blue-600 border border-blue-100" 
                : "bg-gray-50 text-gray-600 border border-gray-100"
            )}>
              {item.speaker === 'question' ? 'Q' : 'A'}
            </div>
          </div>
        )}
        
        {/* Content */}
        <div className={cn(
          "flex-1 relative",
          isConsecutiveSameSpeaker && "ml-11"
        )}>
          {/* Clean category tag */}
          {item.category && (
            <span className={cn(
              "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mb-1.5",
              item.category === 'painpoint' 
                ? "bg-red-50 text-red-700"
                : "bg-emerald-50 text-emerald-700"
            )}>
              {item.category === 'painpoint' ? 'Pain Point' : 'Need'}
            </span>
          )}
          
          {/* Editable content */}
          <div className="relative">
            <div
              ref={contentEditableRef}
              contentEditable={isEditing}
              suppressContentEditableWarning
              onClick={handleClick}
              onBlur={handleBlur}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              className={cn(
                "text-sm leading-relaxed text-gray-800 outline-none transition-all duration-150",
                "rounded-md px-3 py-2 -mx-3 -my-2",
                isEditing 
                  ? "bg-white shadow-sm border border-gray-200 cursor-text" 
                  : "hover:bg-gray-50/80 cursor-pointer border border-transparent",
                "focus:ring-0 focus:outline-none"
              )}
              style={{
                minHeight: '28px',
                wordBreak: 'break-word'
              }}
            >
              {item.cleaned_sentence}
            </div>
            
            {/* Presence overlays */}
            {isEditing && renderPresences()}
            
            {/* Notion-style minimal status indicator */}
            {editStatus !== 'idle' && (
              <div className="absolute -top-1 -right-1 z-20">
                {editStatus === 'saving' && (
                  <div className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-xs font-medium border border-blue-200">
                    <div className="w-2 h-2 border border-blue-600 border-t-transparent rounded-full animate-spin" />
                    저장중
                  </div>
                )}
                {editStatus === 'saved' && (
                  <div className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md text-xs font-medium border border-emerald-200">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    저장됨
                  </div>
                )}
                {editStatus === 'error' && (
                  <div className="flex items-center gap-1 bg-red-50 text-red-600 px-2 py-1 rounded-md text-xs font-medium border border-red-200">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    오류
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Minimal line number - only show on hover */}
          <div className="mt-1 opacity-0 group-hover:opacity-60 transition-opacity">
            <span className="text-xs text-gray-400 select-none font-mono">
              {item.id[0]}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}