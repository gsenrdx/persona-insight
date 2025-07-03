'use client'

import { useState, useRef, useEffect } from 'react'
import { Interview } from '@/types/interview'
import { ChevronRight, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import InterviewScriptViewer from './interview-script-viewer'
import InterviewInsights from './interview-insights'
import { PresenceIndicatorCompact } from '@/components/ui/presence-indicator'
import { EditInterviewMetadataModal } from '@/components/modal/edit-interview-metadata-modal'
import { useAuth } from '@/hooks/use-auth'
import { motion, AnimatePresence } from 'framer-motion'

interface InterviewDetailProps {
  interview: Interview
  onBack: () => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  presence?: any[]
  currentUserId?: string
  onSectionsChange?: (sections: any[] | null, activeSection: string | null, scrollToSection: ((sectionName: string) => void) | null) => void
}

export default function InterviewDetail({ interview, onBack, presence = [], currentUserId, onSectionsChange }: InterviewDetailProps) {
  const [activeTab, setActiveTab] = useState('insights') // 인사이트 탭을 기본값으로
  const scriptViewerRef = useRef<any>(null)
  const [scriptSections, setScriptSections] = useState<any[] | null>(null)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [scrollToSection, setScrollToSection] = useState<((sectionName: string) => void) | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const { profile } = useAuth()
  
  // 수정 권한 확인
  const canEdit = currentUserId && (interview.created_by === currentUserId || profile?.role === 'super_admin' || profile?.role === 'company_admin')
  
  // 컴포넌트 언마운트 시 목차 정리
  useEffect(() => {
    return () => {
      if (onSectionsChange) {
        onSectionsChange(null, null, null)
      }
    }
  }, [onSectionsChange])

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
  const handleEvidenceClick = (scriptIds: number[]) => {
    handleTabChange('script')
    // TODO: 스크립트 뷰어에서 해당 ID로 스크롤하는 기능 추가
  }

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 영역 */}
      <div className="mb-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => {
              // 목차 정보 초기화
              if (onSectionsChange) {
                onSectionsChange(null, null, null)
              }
              onBack()
            }}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            인터뷰 관리
          </button>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
          <span className="text-sm font-medium text-foreground">
            {interview.title || '제목 없음'}
          </span>
        </div>
        
        {/* 헤더 컨텐츠 */}
        <div>
          {/* 제목과 탭 네비게이션 - 같은 줄 */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {interview.title || '제목 없음'}
              </h1>
              {canEdit && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-all"
                  title="정보 수정"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* 탭 네비게이션 - 우측 배치 */}
            <div className="flex items-center gap-6 relative">
              <button
                onClick={() => handleTabChange('insights')}
                className={cn(
                  "text-sm transition-all relative pb-1",
                  activeTab === 'insights' 
                    ? "text-gray-900 font-semibold" 
                    : "text-gray-400 hover:text-gray-600 font-medium"
                )}
              >
                인사이트
                {activeTab === 'insights' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-blue-600"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => handleTabChange('script')}
                className={cn(
                  "text-sm transition-all relative pb-1",
                  activeTab === 'script' 
                    ? "text-gray-900 font-semibold" 
                    : "text-gray-400 hover:text-gray-600 font-medium"
                )}
              >
                대화 스크립트
                {activeTab === 'script' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-blue-600"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            </div>
          </div>
          
          {/* 메타 정보와 실시간 시청자 정보 - 두 번째 줄 */}
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {/* 인터뷰이 정보 */}
              {interview.interviewee_profile?.[0]?.demographics && (
                <>
                  {interview.interviewee_profile[0].demographics.age_group && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-md">
                      <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-xs text-blue-700 font-medium">
                        {interview.interviewee_profile[0].demographics.age_group}
                      </span>
                    </div>
                  )}
                  
                  {interview.interviewee_profile[0].demographics.gender && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 rounded-md">
                      <span className="text-xs text-purple-700 font-medium">
                        {interview.interviewee_profile[0].demographics.gender}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* 실시간 시청자 정보 - 가장 우측 */}
            {presence && presence.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-600 font-medium">
                  {presence.length}명 보는 중
                </span>
                <PresenceIndicatorCompact 
                  viewers={presence}
                  currentUserId={currentUserId}
                />
              </div>
            )}
          </div>
        </div>
        
        {/* 구분선 */}
        <div className="h-px bg-gradient-to-r from-gray-200 via-gray-200/50 to-transparent mt-6" />
      </div>
      
      {/* 탭 콘텐츠 영역 */}
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          {activeTab === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full"
            >
              <InterviewInsights 
                interview={interview} 
                onEvidenceClick={handleEvidenceClick}
              />
            </motion.div>
          )}
          
          {activeTab === 'script' && (
            <motion.div
              key="script"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full"
            >
              <InterviewScriptViewer 
                script={interview.cleaned_script || []} 
                interview={interview}
                className="h-full"
                onSectionsChange={handleScriptSectionsChange}
              />
            </motion.div>
          )}
        </AnimatePresence>
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
    </div>
  )
}