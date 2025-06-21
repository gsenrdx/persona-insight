'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  ArrowLeft, 
  Calendar,
  User, 
  Edit,
  Trash2,
  Download,
  Quote,
  Tag,
  AlertTriangle,
  Target,
  Lightbulb,
  BarChart3,
  TrendingUp
} from "lucide-react"
import { IntervieweeData } from "@/types/interviewee"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"

interface CriteriaConfig {
  x_axis?: {
    name?: string
    description?: string
    low_end_label?: string
    high_end_label?: string
  }
  y_axis?: {
    name?: string
    description?: string
    low_end_label?: string
    high_end_label?: string
  }
  output_config?: {
    x_low_score_field?: string
    x_high_score_field?: string
    y_low_score_field?: string
    y_high_score_field?: string
  }
}

interface InterviewDetailProps {
  interview: IntervieweeData
  criteriaConfig: CriteriaConfig | null
  onBack: () => void
  onDelete: (interviewId: string) => void
}

export default function InterviewDetail({ interview, criteriaConfig, onBack, onDelete }: InterviewDetailProps) {
  const { profile } = useAuth()

  // JSON 파싱 헬퍼 함수
  const parseInterviewDetail = (detail: any) => {
    if (!detail) return null
    if (Array.isArray(detail)) return detail
    if (typeof detail === 'string') {
      try {
        let cleanedDetail = detail.trim()
        cleanedDetail = cleanedDetail.replace(/^```[\s\S]*?\n/, '').replace(/\n```[\s\S]*$/, '')
        
        let jsonStartIndex = cleanedDetail.indexOf('[')
        if (jsonStartIndex === -1) return null
        
        let bracketCount = 0
        let jsonEndIndex = -1
        
        for (let i = jsonStartIndex; i < cleanedDetail.length; i++) {
          if (cleanedDetail[i] === '[') bracketCount++
          else if (cleanedDetail[i] === ']') {
            bracketCount--
            if (bracketCount === 0) {
              jsonEndIndex = i
              break
            }
          }
        }
        
        if (jsonEndIndex === -1) return null
        
        cleanedDetail = cleanedDetail.substring(jsonStartIndex, jsonEndIndex + 1)
        let fixedJson = cleanedDetail
          .replace(/,(\s*[}\]])/g, '$1')
          .replace(/([}\]]),\s*([}\]])/g, '$1$2')
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
        
        return JSON.parse(fixedJson)
      } catch (error) {
        return null
      }
    }
    return null
  }

  const handleDelete = () => {
    if (confirm('정말로 이 인터뷰를 삭제하시겠습니까?\n삭제 후에는 복구가 불가능합니다.')) {
      onDelete(interview.id)
    }
  }

  const handleDownload = async () => {
    if (!interview.file_path) {
      alert('다운로드할 파일이 없습니다.')
      return
    }

    try {
      // Supabase에서 현재 세션 가져오기
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        alert('인증 정보를 찾을 수 없습니다. 다시 로그인해주세요.')
        return
      }

      const response = await fetch(`/api/files/download?id=${interview.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('파일 다운로드에 실패했습니다.')
      }

      // 파일 다운로드 처리
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Content-Disposition 헤더에서 파일명 추출
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'interview_file'
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1] || 'interview_file'
        }
      }
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      // \ub2e4\uc6b4\ub85c\ub4dc \uc624\ub958 \ubc1c\uc0dd
      alert('파일 다운로드 중 오류가 발생했습니다.')
    }
  }

  const parsedDetail = parseInterviewDetail(interview.interview_detail)

  // 동적 점수 계산 로직 (workflow/route.ts와 동일)
  const getPersonaCoordinates = () => {
    
    if (!interview.x_axis || !interview.y_axis || 
        !Array.isArray(interview.x_axis) || !Array.isArray(interview.y_axis) ||
        interview.x_axis.length === 0 || interview.y_axis.length === 0) {
      return null
    }
    
    const xScore = interview.x_axis[0] as Record<string, number> | undefined
    const yScore = interview.y_axis[0] as Record<string, number> | undefined
    
    
    // X축 점수: high score 필드 동적 감지
    const xHighKeys = xScore ? Object.keys(xScore).filter(key => 
      key.includes('high') || key.includes('우측') || key.includes('즉시') || 
      (key.endsWith('_score') && !key.includes('low') && !key.includes('좌측') && !key.includes('루틴'))
    ) : []
    
    // Y축 점수: high score 필드 동적 감지  
    const yHighKeys = yScore ? Object.keys(yScore).filter(key => 
      key.includes('high') || key.includes('상단') || key.includes('속도') || key.includes('경험') ||
      (key.endsWith('_score') && !key.includes('low') && !key.includes('하단') && !key.includes('가성비'))
    ) : []
    
    // X축 low score 필드 동적 감지
    const xLowKeys = xScore ? Object.keys(xScore).filter(key => 
      key.includes('low') || key.includes('좌측') || key.includes('루틴') || 
      (key.endsWith('_score') && !xHighKeys.includes(key))
    ) : []
    
    // Y축 low score 필드 동적 감지
    const yLowKeys = yScore ? Object.keys(yScore).filter(key => 
      key.includes('low') || key.includes('하단') || key.includes('가성비') ||
      (key.endsWith('_score') && !yHighKeys.includes(key))
    ) : []
    
    const xCoordinate = xHighKeys.length > 0 && xHighKeys[0] && xScore ? xScore[xHighKeys[0]] : 0
    const yCoordinate = yHighKeys.length > 0 && yHighKeys[0] && yScore ? yScore[yHighKeys[0]] : 0
    const xLow = xLowKeys.length > 0 && xLowKeys[0] && xScore ? xScore[xLowKeys[0]] : 0
    const yLow = yLowKeys.length > 0 && yLowKeys[0] && yScore ? yScore[yLowKeys[0]] : 0
    
    
    return { 
      x: xCoordinate, 
      y: yCoordinate,
      xLow,
      yLow,
      xHighField: xHighKeys[0] || 'high_score',
      yHighField: yHighKeys[0] || 'high_score',
      xLowField: xLowKeys[0] || 'low_score',
      yLowField: yLowKeys[0] || 'low_score'
    }
  }

  const coordinates = getPersonaCoordinates()
  

  return (
    <div className="max-w-5xl mx-auto space-y-8 min-h-screen">
      {/* 헤더 네비게이션 */}
      <div className="bg-white border-b border-gray-200 -mx-4 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            목록으로
          </Button>
          
          <div className="flex items-center gap-3">
            {/* 파일 다운로드 버튼 */}
            {interview.file_path && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownload}
                className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
              >
                <Download className="w-4 h-4 mr-2" />
                인터뷰 원본
              </Button>
            )}
            
            {/* 삭제 버튼 - 생성자만 표시 */}
            {interview.created_by === profile?.id && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleDelete}
                className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                삭제
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {/* 인터뷰 헤더 */}
        <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-8 border-b border-gray-100 overflow-hidden">
          {/* 페르소나 썸네일 배경 */}
          {interview.thumbnail && (
            <div className="absolute right-0 top-0 bottom-0 w-56 opacity-25">
              <div 
                className="w-full h-full bg-cover bg-center bg-no-repeat"
                style={{ 
                  backgroundImage: `url(${interview.thumbnail})`,
                  maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0) 100%)',
                  WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0) 100%)'
                }}
              />
            </div>
          )}
          
          {/* 콘텐츠 */}
          <div className="relative z-10">
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {interview.interviewee_fake_name || '이름 없음'}
                </h1>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    {new Date(interview.session_date).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <Badge variant="secondary" className={`${
                    !interview.persona_reflected 
                      ? 'bg-gray-100 text-gray-600 border-gray-300' 
                      : 'bg-white/80 border-gray-200'
                  }`}>
                    {interview.persona_reflected 
                      ? (interview.personas?.persona_type ? 
                          `${interview.personas.persona_type} - ${interview.personas.persona_title || ''}` : 
                          interview.user_type)
                      : '미분류'
                    }
                  </Badge>
                  {interview.created_by_profile && (
                    <div className="text-gray-600 text-xs">
                      작성자: <span className="font-medium">
                        {interview.created_by === profile?.id ? '나' : interview.created_by_profile.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 요약 정보 섹션 */}
        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 핵심 요약 */}
            {interview.interviewee_summary && (
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
                  핵심 요약
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {interview.interviewee_summary}
                </p>
              </div>
            )}

            {/* 인터뷰 스타일 */}
            {interview.interviewee_style && (
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-2 h-6 bg-indigo-500 rounded-full"></div>
                  인터뷰 스타일
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {interview.interviewee_style}
                </p>
              </div>
            )}

            {/* 평가 점수 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-2 h-6 bg-green-500 rounded-full"></div>
                평가 점수
              </h3>
            
              {coordinates ? (
                /* 평가 점수 바 그래프 */
                <div className="space-y-4">
                  {/* X축 점수 */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-3">
                      {criteriaConfig?.x_axis?.name || 'X축'}
                    </div>
                    
                    {/* High Score 바 */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">{coordinates?.xHighField?.replace('_score', '') || '높음'}</span>
                        <span className="text-xs font-bold text-blue-600">{coordinates?.x || 0}점</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                          style={{ width: `${coordinates?.x || 0}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Low Score 바 */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">{coordinates?.xLowField?.replace('_score', '') || '낮음'}</span>
                        <span className="text-xs font-bold text-gray-500">{coordinates?.xLow || 0}점</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-gray-400 to-gray-500 rounded-full transition-all duration-500"
                          style={{ width: `${coordinates?.xLow || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Y축 점수 */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-3">
                      {criteriaConfig?.y_axis?.name || 'Y축'}
                    </div>
                    
                    {/* High Score 바 */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">{coordinates?.yHighField?.replace('_score', '') || '높음'}</span>
                        <span className="text-xs font-bold text-purple-600">{coordinates?.y || 0}점</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-500"
                          style={{ width: `${coordinates?.y || 0}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Low Score 바 */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">{coordinates?.yLowField?.replace('_score', '') || '낮음'}</span>
                        <span className="text-xs font-bold text-gray-500">{coordinates?.yLow || 0}점</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-gray-400 to-gray-500 rounded-full transition-all duration-500"
                          style={{ width: `${coordinates?.yLow || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* 데이터 없을 때 */
                <div className="w-full bg-white rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                  <div className="text-sm text-gray-400">평가 데이터 없음</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 상세 분석 섹션 */}
      {parsedDetail && Array.isArray(parsedDetail) && parsedDetail.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-8 py-6 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-3 h-8 bg-blue-500 rounded-full"></div>
              상세 분석 보고서
            </h2>
            <p className="text-sm text-gray-600 mt-2">인터뷰 내용의 심층 분석 결과입니다.</p>
          </div>
          
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {parsedDetail.map((detail: any, index: number) => (
                <Card key={index} className="border border-gray-200 shadow-sm h-fit">
                  <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      {detail.topic_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-5">
                    {/* 페인포인트 */}
                    {detail.painpoint && detail.painpoint.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          페인포인트 ({detail.painpoint.length})
                        </h5>
                        <div className="space-y-1">
                          {detail.painpoint.map((pain: string, idx: number) => (
                            <div key={idx} className="text-xs text-gray-700 bg-red-50 rounded p-2">
                              <span className="text-red-600 font-medium">{idx + 1}.</span> {pain}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 니즈 */}
                    {detail.need && detail.need.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          니즈 ({detail.need.length})
                        </h5>
                        <div className="space-y-1">
                          {detail.need.map((need: string, idx: number) => (
                            <div key={idx} className="text-xs text-gray-700 bg-blue-50 rounded p-2">
                              <span className="text-blue-600 font-medium">{idx + 1}.</span> {need}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 인사이트 인용구 */}
                    {detail.insight_quote && detail.insight_quote.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                          <Lightbulb className="w-3 h-3" />
                          인사이트 ({detail.insight_quote.length})
                        </h5>
                        <div className="space-y-2">
                          {detail.insight_quote.map((quote: string, idx: number) => (
                            <div key={idx} className="bg-green-50 rounded p-3 border-l-3 border-green-200">
                              <p className="text-xs text-gray-700 italic">&quot;{quote}&quot;</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 키워드 */}
                    {detail.keyword_cluster && detail.keyword_cluster.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-purple-700 mb-2 flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          키워드 ({detail.keyword_cluster.length})
                        </h5>
                        <div className="flex flex-wrap gap-1">
                          {detail.keyword_cluster.map((keyword: string, idx: number) => (
                            <Badge 
                              key={idx} 
                              variant="outline" 
                              className="bg-purple-50 border-purple-200 text-purple-700 text-xs px-2 py-0.5"
                            >
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}