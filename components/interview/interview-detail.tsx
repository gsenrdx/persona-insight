'use client'

import { useState, useRef } from 'react'
import { Interview } from '@/types/interview'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronRight } from 'lucide-react'
import InterviewScriptViewer from './interview-script-viewer'
import InterviewInsights from './interview-insights'

interface InterviewDetailProps {
  interview: Interview
  onBack: () => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export default function InterviewDetail({ interview, onBack }: InterviewDetailProps) {
  const [activeTab, setActiveTab] = useState('insights')
  const scriptViewerRef = useRef<any>(null)

  // 인사이트에서 근거 문장 클릭 시 스크립트 탭으로 이동
  const handleEvidenceClick = (scriptIds: number[]) => {
    setActiveTab('script')
    // TODO: 스크립트 뷰어에서 해당 ID로 스크롤하는 기능 추가
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 헤더 영역 */}
      <div className="bg-white border-b border-gray-100">
        {/* Breadcrumb */}
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="flex items-center gap-1.5 text-sm">
            <button
              onClick={onBack}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              인터뷰 관리
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-700 font-medium">
              {interview.title || '제목 없음'}
            </span>
          </div>
        </div>
        
      </div>
      
      {/* 탭 콘텐츠 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        {/* 탭 네비게이션 */}
        <div className="bg-white">
          <div className="px-6">
            <TabsList className="h-11 bg-transparent p-0 gap-6">
              <TabsTrigger 
                value="insights"
                className="h-11 px-0 pb-0 pt-0 rounded-none border-b-2 data-[state=active]:border-gray-900 data-[state=inactive]:border-transparent data-[state=active]:text-gray-900 data-[state=inactive]:text-gray-500 hover:text-gray-700 transition-colors text-sm font-medium bg-transparent shadow-none"
              >
                인사이트
              </TabsTrigger>
              <TabsTrigger 
                value="script" 
                className="h-11 px-0 pb-0 pt-0 rounded-none border-b-2 data-[state=active]:border-gray-900 data-[state=inactive]:border-transparent data-[state=active]:text-gray-900 data-[state=inactive]:text-gray-500 hover:text-gray-700 transition-colors text-sm font-medium bg-transparent shadow-none"
              >
                대화 스크립트
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
        
        {/* 탭 콘텐츠 영역 */}
        <div className="flex-1 overflow-auto">
          <TabsContent value="insights" className="h-full m-0">
            <InterviewInsights 
              interview={interview} 
              onEvidenceClick={handleEvidenceClick}
            />
          </TabsContent>
          
          <TabsContent value="script" className="h-full m-0">
            <InterviewScriptViewer 
              ref={scriptViewerRef}
              script={interview.cleaned_script || []} 
              interview={interview}
              className="h-full"
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}