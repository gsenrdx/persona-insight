'use client'

import { useState, useRef, useEffect } from 'react'
import { Interview } from '@/types/interview'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import InterviewScriptViewer from './interview-script-viewer'
import InterviewInsights from './interview-insights'
import { PresenceIndicatorCompact } from '@/components/ui/presence-indicator'

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
        
        {/* 헤더 컨텐츠와 탭 네비게이션 */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* 인터뷰 제목 */}
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {interview.title || '제목 없음'}
            </h1>
            
            {/* 메타 정보 */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{new Date(interview.created_at).toLocaleDateString('ko-KR')}</span>
              {interview.interviewee_profile?.[0]?.demographics && (
                <>
                  <span>·</span>
                  <span>{interview.interviewee_profile[0].demographics.age_group}</span>
                  <span>·</span>
                  <span>{interview.interviewee_profile[0].demographics.gender}</span>
                </>
              )}
              {presence && presence.length > 0 && (
                <>
                  <span>·</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">현재 보는 중:</span>
                    <PresenceIndicatorCompact 
                      viewers={presence}
                      currentUserId={currentUserId}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* 탭 네비게이션 - 우측 배치 */}
          <div className="flex items-center gap-6 ml-8">
            <button
              onClick={() => handleTabChange('insights')}
              className={cn(
                "text-sm transition-all",
                activeTab === 'insights' 
                  ? "text-gray-900 font-semibold" 
                  : "text-gray-400 hover:text-gray-600 font-medium"
              )}
            >
              인사이트
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => handleTabChange('script')}
              className={cn(
                "text-sm transition-all",
                activeTab === 'script' 
                  ? "text-gray-900 font-semibold" 
                  : "text-gray-400 hover:text-gray-600 font-medium"
              )}
            >
              대화 스크립트
            </button>
          </div>
        </div>
        
        {/* 구분선 */}
        <div className="h-px bg-gradient-to-r from-gray-200 via-gray-200/50 to-transparent mt-6" />
      </div>
      
      {/* 탭 콘텐츠 영역 */}
      <div className="flex-1">
        {activeTab === 'insights' && (
          <InterviewInsights 
            interview={interview} 
            onEvidenceClick={handleEvidenceClick}
          />
        )}
        
        {activeTab === 'script' && (
          <InterviewScriptViewer 
            script={interview.cleaned_script || []} 
            interview={interview}
            className="h-full"
            onSectionsChange={handleScriptSectionsChange}
          />
        )}
      </div>
    </div>
  )
}