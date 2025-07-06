'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { CleanedScriptItem } from '@/types/interview'
import { ScriptPresencePayload } from '@/lib/realtime/broadcast/types'
import { debounce } from 'lodash'

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
  const [isEditing, setIsEditing] = useState(false)
  const [editingText, setEditingText] = useState(item.cleaned_sentence)
  const contentEditableRef = useRef<HTMLDivElement>(null)
  const scriptId = item.id.join('-')
  
  // Debounced save function
  const debouncedSave = useCallback(
    debounce((text: string) => {
      onEdit(scriptId, text)
    }, 500),
    [scriptId, onEdit]
  )
  
  // Handle selection change for presence
  useEffect(() => {
    if (!isEditing) return
    
    const handleSelectionChange = () => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return
      
      const range = selection.getRangeAt(0)
      if (!contentEditableRef.current?.contains(range.commonAncestorContainer)) return
      
      // Calculate cursor position and selection
      const cursorPosition = range.startOffset
      const hasSelection = !range.collapsed
      
      onPresenceUpdate({
        scriptId,
        cursorPosition,
        selection: hasSelection ? {
          start: range.startOffset,
          end: range.endOffset
        } : undefined
      })
    }
    
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [isEditing, scriptId, onPresenceUpdate])
  
  // Handle editing
  const handleClick = () => {
    if (!isEditing) {
      setIsEditing(true)
      onPresenceUpdate({ scriptId })
      
      // Focus and select all text
      setTimeout(() => {
        if (contentEditableRef.current) {
          contentEditableRef.current.focus()
          const range = document.createRange()
          range.selectNodeContents(contentEditableRef.current)
          const selection = window.getSelection()
          selection?.removeAllRanges()
          selection?.addRange(range)
        }
      }, 0)
    }
  }
  
  const handleBlur = () => {
    setIsEditing(false)
    onPresenceUpdate({ scriptId: undefined })
    
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
  
  // Render other users' cursors and selections
  const renderPresences = () => {
    if (!contentEditableRef.current) return null
    
    return presences.map((presence) => {
      const { userId, userName, color, cursorPosition, selection } = presence
      
      return (
        <div key={userId} className="absolute inset-0 pointer-events-none">
          {/* Selection highlight */}
          {selection && (
            <div
              className="absolute"
              style={{
                backgroundColor: `${color}20`,
                left: `${(selection.start / editingText.length) * 100}%`,
                width: `${((selection.end - selection.start) / editingText.length) * 100}%`,
                height: '100%',
                borderRadius: '2px'
              }}
            />
          )}
          
          {/* Cursor */}
          {cursorPosition !== undefined && (
            <div
              className="absolute"
              style={{
                left: `${(cursorPosition / editingText.length) * 100}%`,
                top: 0,
                bottom: 0,
                width: '2px',
                backgroundColor: color
              }}
            >
              {/* User label */}
              <div
                className="absolute -top-6 left-0 whitespace-nowrap"
                style={{
                  backgroundColor: color,
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 500
                }}
              >
                {userName}
              </div>
            </div>
          )}
        </div>
      )
    })
  }
  
  return (
    <div
      className={cn(
        "group relative",
        isEditing && "ring-2 ring-blue-500 rounded-md",
        className
      )}
    >
      <div className="flex gap-3">
        {/* Speaker indicator */}
        {!isConsecutiveSameSpeaker && (
          <div className="flex-shrink-0 w-8 mt-0.5">
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
              item.speaker === 'question' 
                ? "bg-blue-100 text-blue-700" 
                : "bg-gray-100 text-gray-700"
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
          {/* Category badge */}
          {item.category && (
            <span className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mb-1",
              item.category === 'painpoint' 
                ? "bg-red-100 text-red-800"
                : "bg-green-100 text-green-800"
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
                "text-sm leading-relaxed text-gray-700 outline-none",
                "hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 transition-colors",
                isEditing && "bg-white cursor-text",
                !isEditing && "cursor-pointer"
              )}
              style={{
                minHeight: '24px',
                wordBreak: 'break-word'
              }}
            >
              {item.cleaned_sentence}
            </div>
            
            {/* Presence overlays */}
            {isEditing && renderPresences()}
          </div>
          
          {/* Line numbers */}
          <div className="mt-1 text-xs text-gray-400 select-none">
            Line {item.id.join(', ')}
          </div>
        </div>
      </div>
    </div>
  )
}