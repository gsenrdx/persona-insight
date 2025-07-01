'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIExitConfirmationProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function AIExitConfirmation({ isOpen, onConfirm, onCancel }: AIExitConfirmationProps) {
  if (!isOpen) return null

  return (
    <>
      {/* 배경 오버레이 */}
      <div 
        className="fixed inset-0 bg-black/20 z-[110]"
        onClick={onCancel}
      />
      
      {/* 확인 대화상자 */}
      <div 
        className="fixed left-1/2 top-1/2 z-[120] bg-white rounded-xl shadow-xl border border-gray-200 p-6 max-w-sm w-full -translate-x-1/2 -translate-y-1/2"
      >
        {/* 로고와 제목 */}
        <div className="flex items-center gap-3 mb-4">
          <svg width="32" height="32" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="512" height="512" rx="154" fill="#2563EB"/>
            <rect x="128" y="128" width="256" height="256" rx="77" fill="white"/>
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">AI 대화 종료</h3>
        </div>
        
        {/* 내용 */}
        <p className="text-sm text-gray-600 mb-6">
          진행 중인 AI 대화를 종료하시겠습니까?<br />
          작성 중인 내용이 사라집니다.
        </p>
        
        {/* 버튼 */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            계속하기
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            종료
          </button>
        </div>
      </div>
    </>
  )
}