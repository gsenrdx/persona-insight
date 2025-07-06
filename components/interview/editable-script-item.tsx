'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { CleanedScriptItem } from '@/types/interview'
import { ScriptPresencePayload } from '@/lib/realtime/broadcast/types'
import { debounce } from 'lodash'

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
  const [isEditing, setIsEditing] = useState(false)
  const [editingText, setEditingText] = useState(item.cleaned_sentence)
  const [editStatus, setEditStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'conflict'>('idle')
  const contentEditableRef = useRef<HTMLDivElement>(null)
  const scriptId = item.id.join('-')
  
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
  
  // Optimized presence update with change detection
  const lastPresenceRef = useRef<Partial<ScriptPresencePayload>>({})
  const debouncedPresenceUpdate = useCallback(
    debounce((presence: Partial<ScriptPresencePayload>) => {
      // Only send update if there's a significant change
      const lastPresence = lastPresenceRef.current
      const hasSignificantChange = 
        presence.scriptId !== lastPresence.scriptId ||
        Math.abs((presence.cursorPosition || 0) - (lastPresence.cursorPosition || 0)) > 2 ||
        (presence.selection?.start !== lastPresence.selection?.start) ||
        (presence.selection?.end !== lastPresence.selection?.end)
      
      if (hasSignificantChange) {
        onPresenceUpdate(presence)
        lastPresenceRef.current = { ...presence }
      }
    }, 150), // Increased to 150ms for better performance
    [onPresenceUpdate]
  )
  
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
      
      debouncedPresenceUpdate(presenceUpdate)
    }
    
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [isEditing, scriptId, debouncedPresenceUpdate])
  
  // Handle editing
  const handleClick = () => {
    if (!isEditing) {
      setIsEditing(true)
      
      // Immediately update presence to show user is editing this script
      onPresenceUpdate({ 
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
          
          // Update presence with initial cursor position
          const cursorCoords = getCaretCoordinates(contentEditableRef.current, 0)
          onPresenceUpdate({
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
    
    // Clear presence when leaving edit mode
    onPresenceUpdate({ 
      scriptId: undefined,
      cursorPosition: undefined,
      cursorCoords: undefined,
      selection: undefined,
      selectionCoords: undefined
    })
    
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
    
    return presences.map((presence) => {
      const { userId, userName, color, cursorCoords, selectionCoords, cursorPosition, selection } = presence
      
      return (
        <div key={userId} className="absolute inset-0 pointer-events-none">
          {/* Selection highlight - use pixel coordinates if available, fallback to text-based */}
          {selectionCoords ? (
            <div
              className="absolute transition-all duration-150 ease-out"
              style={{
                backgroundColor: `${color}28`,
                border: `1px solid ${color}40`,
                left: `${selectionCoords.x}px`,
                top: `${selectionCoords.y}px`,
                width: `${selectionCoords.width}px`,
                height: `${selectionCoords.height}px`,
                borderRadius: '3px',
                boxShadow: `0 0 8px ${color}20`
              }}
            />
          ) : selection && (
            /* Fallback to text-based positioning */
            <div
              className="absolute transition-all duration-150 ease-out"
              style={{
                backgroundColor: `${color}20`,
                left: `${(selection.start / editingText.length) * 100}%`,
                width: `${((selection.end - selection.start) / editingText.length) * 100}%`,
                height: '100%',
                borderRadius: '2px'
              }}
            />
          )}
          
          {/* Cursor - use pixel coordinates if available, fallback to text-based */}
          {cursorCoords ? (
            <div
              className="absolute transition-all duration-150 ease-out"
              style={{
                left: `${cursorCoords.x}px`,
                top: `${cursorCoords.y}px`,
                width: '2px',
                height: '1.2em',
                backgroundColor: color,
                borderRadius: '1px',
                boxShadow: `0 0 4px ${color}60`
              }}
            >
              {/* Cursor animation */}
              <div
                className="absolute inset-0 animate-pulse"
                style={{
                  backgroundColor: color,
                  borderRadius: '1px'
                }}
              />
              
              {/* User label with improved styling */}
              <div
                className="absolute -top-8 left-0 whitespace-nowrap z-10 transition-opacity duration-200"
                style={{
                  backgroundColor: color,
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  boxShadow: `0 2px 8px ${color}40`,
                  transform: 'translateX(-50%)'
                }}
              >
                {userName || 'Anonymous'}
                {/* Arrow pointing down */}
                <div
                  className="absolute top-full left-1/2 transform -translate-x-1/2"
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderTop: `4px solid ${color}`
                  }}
                />
              </div>
            </div>
          ) : cursorPosition !== undefined && (
            /* Fallback to text-based positioning */
            <div
              className="absolute transition-all duration-150 ease-out"
              style={{
                left: `${(cursorPosition / editingText.length) * 100}%`,
                top: 0,
                bottom: 0,
                width: '2px',
                backgroundColor: color,
                borderRadius: '1px'
              }}
            >
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
            
            {/* Edit status indicator */}
            {editStatus !== 'idle' && (
              <div className="absolute -top-2 -right-2 z-20">
                {editStatus === 'saving' && (
                  <div className="flex items-center gap-1.5 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium shadow-sm">
                    <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    저장 중
                  </div>
                )}
                {editStatus === 'saved' && (
                  <div className="flex items-center gap-1.5 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium shadow-sm animate-in slide-in-from-top-2">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    저장됨
                  </div>
                )}
                {editStatus === 'error' && (
                  <div className="flex items-center gap-1.5 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium shadow-sm">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    저장 실패
                  </div>
                )}
                {editStatus === 'conflict' && (
                  <div className="flex items-center gap-1.5 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-medium shadow-sm">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    편집 충돌
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Line numbers and other users indicator */}
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs text-gray-400 select-none">
              Line {item.id.join(', ')}
            </span>
            {presences.length > 0 && !isEditing && (
              <div className="flex items-center gap-1">
                <div className="flex -space-x-1">
                  {presences.slice(0, 3).map((presence) => (
                    <div
                      key={presence.userId}
                      className="w-4 h-4 rounded-full border border-white shadow-sm"
                      style={{ backgroundColor: presence.color }}
                      title={`${presence.userName}님이 보고 있습니다`}
                    />
                  ))}
                  {presences.length > 3 && (
                    <div className="w-4 h-4 rounded-full bg-gray-200 border border-white shadow-sm flex items-center justify-center">
                      <span className="text-xs text-gray-600 font-medium">+{presences.length - 3}</span>
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-500 ml-1">
                  {presences.length}명 보는 중
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}