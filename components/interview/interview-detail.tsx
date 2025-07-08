'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Interview } from '@/types/interview'
import { Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import InterviewScriptViewer from './interview-script-viewer'
import InterviewInsights from './interview-insights'
import InterviewAssistantPanel from './interview-assistant-panel'
import { EditInterviewMetadataModal } from '@/components/modal/edit-interview-metadata-modal'
import { useAuth } from '@/hooks/use-auth'

interface InterviewDetailProps {
  interview: Interview
  onBack: () => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onSectionsChange?: (sections: any[] | null, activeSection: string | null, scrollToSection: ((sectionName: string) => void) | null) => void
  hideHeader?: boolean
}

export default function InterviewDetail({ interview, onBack, onSectionsChange }: InterviewDetailProps) {
  const [activeTab, setActiveTab] = useState('insights') // 인사이트 탭을 기본값으로
  const [scriptSections, setScriptSections] = useState<any[] | null>(null)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [scrollToSection, setScrollToSection] = useState<((sectionName: string) => void) | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [floatingPanelOpen, setFloatingPanelOpen] = useState(false)
  const { profile } = useAuth()
  
  // 컴포넌트 언마운트 시 목차 정리
  useEffect(() => {
    return () => {
      if (onSectionsChange) {
        onSectionsChange(null, null, null)
      }
    }
  }, [onSectionsChange])

  // 인터뷰가 없으면 로딩 표시
  if (!interview) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">인터뷰를 불러오는 중...</p>
        </div>
      </div>
    )
  }
  
  // 수정 권한 확인
  const canEdit = profile?.id && interview.created_by && (interview.created_by === profile.id || profile?.role === 'super_admin' || profile?.role === 'company_admin')

  // 스크립트 뷰어에서 섹션 정보가 변경될 때
  const handleScriptSectionsChange = (sections: any[] | null, active: string | null, scrollFn: (sectionName: string) => void) => {
    setScriptSections(sections)
    setActiveSection(active)
    setScrollToSection(() => scrollFn)
    
    // 스크립트 탭이 활성화된 경우에만 상위 컴포넌트로 전달
    if (onSectionsChange && activeTab === 'script') {
      onSectionsChange(sections, active, scrollFn)
    }
  }
  
  // 탭이 변경될 때 목차 정보 업데이트
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    
    if (onSectionsChange) {
      if (tab === 'script' && scriptSections) {
        // 스크립트 탭으로 전환 시 목차 정보 전달
        onSectionsChange(scriptSections, activeSection, scrollToSection)
      } else {
        // 다른 탭으로 전환 시 목차 정보 제거
        onSectionsChange(null, null, null)
      }
    }
  }

  // 인사이트에서 근거 문장 클릭 시 스크립트 탭으로 이동
  const handleEvidenceClick = () => {
    handleTabChange('script')
    // TODO: 스크립트 뷰어에서 해당 ID로 스크롤하는 기능 추가
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm overflow-hidden">
      {/* 개선된 헤더 */}
      <div className="bg-white border-b border-gray-200">
        {/* 브레드크럼 */}
        <div className="px-4 sm:px-6 pt-4 pb-2">
          <button
            onClick={() => {
              if (onSectionsChange) {
                onSectionsChange(null, null, null)
              }
              onBack()
            }}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            인터뷰 관리
          </button>
        </div>
        
        {/* 메인 제목 영역 */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
                  {interview.title || '제목 없음'}
                </h1>
                {canEdit && (
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all"
                    title="정보 수정"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* 메타 정보 */}
              {(interview.interview_date || interview.session_info?.[0]?.interview_topic) && (
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  {interview.interview_date && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-4 h-4 text-gray-400">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="font-medium">
                        {new Date(interview.interview_date).toLocaleDateString('ko-KR', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                  )}
                  {interview.session_info?.[0]?.interview_topic && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-4 h-4 text-gray-400">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <span className="font-medium line-clamp-1">
                        {interview.session_info[0].interview_topic}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* 탭 네비게이션 - 우측으로 이동 */}
            <div className="flex bg-gray-50 rounded-lg p-1">
              <button
                onClick={() => handleTabChange('insights')}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap",
                  activeTab === 'insights' 
                    ? "text-blue-600 bg-white shadow-sm" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                )}
              >
                인사이트
              </button>
              <button
                onClick={() => handleTabChange('script')}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap",
                  activeTab === 'script' 
                    ? "text-blue-600 bg-white shadow-sm" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                )}
              >
                스크립트
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* 탭 콘텐츠 영역 */}
      <div className="flex-1 min-h-0 overflow-auto">
        {activeTab === 'insights' ? (
          <InterviewInsights 
            interview={interview} 
          />
        ) : (
          <InterviewScriptViewer 
            script={interview.cleaned_script || []} 
            interview={interview}
            className=""
            onSectionsChange={handleScriptSectionsChange}
            canEdit={canEdit}
          />
        )}
      </div>
      
      {/* 메타데이터 수정 모달 */}
      <EditInterviewMetadataModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        interview={interview}
        onUpdate={() => {
          setShowEditModal(false)
          // 실시간 업데이트로 인해 자동으로 반영됨
        }}
      />
      
      {/* Floating button for AI assistant */}
      {typeof window !== 'undefined' && createPortal(
        <>
          {/* 플로팅 버튼 */}
          <div className="fixed right-6 bottom-6 z-[100]">
            <button
              onClick={() => setFloatingPanelOpen(!floatingPanelOpen)}
              className={cn(
                "group relative flex flex-col items-center gap-1 p-2 transition-transform duration-200 hover:scale-[1.02] active:scale-95",
                floatingPanelOpen && "scale-0 opacity-0 pointer-events-none"
              )}
              title="AI 도우미"
            >
              {/* AI 캐릭터 - CSS로 hover 처리 */}
              <div className="relative w-16 h-16">
                <img
                  src="/chat-icon.png"
                  alt="AI Assistant"
                  className="absolute inset-0 w-full h-full object-contain opacity-100 group-hover:opacity-0 transition-opacity duration-200"
                />
                <img
                  src="/pin-smile.png"
                  alt="AI Assistant Hover"
                  className="absolute inset-0 w-full h-full object-contain opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                />
              </div>
              
              {/* 명찰 */}
              <div className="text-gray-900 text-xs font-thin px-3 py-1">
                Ask Pin!
              </div>
            </button>
          </div>
          
          <InterviewAssistantPanel
            isOpen={floatingPanelOpen}
            onClose={() => setFloatingPanelOpen(false)}
            interview={interview}
            script={interview.cleaned_script || []}
            context={activeTab === 'script' ? 'interview' : 'insights'}
          />
        </>,
        document.body
      )}
    </div>
  )
}