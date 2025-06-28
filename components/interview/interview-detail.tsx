'use client'

import { useState, useRef } from 'react'
import { Interview } from '@/types/interview'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, MessageSquare, Lightbulb } from 'lucide-react'
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
    <div className="flex flex-col h-full">
      {/* 고정 헤더 영역 */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-200 bg-white">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          뒤로가기
        </Button>
        <h1 className="text-lg font-semibold text-gray-900">
          인터뷰 상세보기
        </h1>
        {interview.title && (
          <span className="text-sm text-gray-500">
            • {interview.title}
          </span>
        )}
      </div>
      
      {/* 탭 콘텐츠 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        {/* 탭 네비게이션 */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6">
            <TabsList className="h-12 bg-transparent p-0 border-b-0">
              <TabsTrigger 
                value="insights"
                className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-4"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                인사이트
              </TabsTrigger>
              <TabsTrigger 
                value="script" 
                className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-4"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
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