'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, FileText, User, BarChart3, TrendingUp, Users, Download, Search, Filter, AlertCircle } from "lucide-react"
import { useAuth } from '@/hooks/use-auth'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { useProjectInsights } from '@/hooks/use-project-insights'
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Project {
  id: string
  name: string
  description: string
  company_id: string
  created_by: string
  visibility: 'public' | 'private'
  join_method: 'open' | 'invite_only' | 'password'
  created_at: string
  member_count?: number
  interview_count?: number
  persona_count?: number
}

interface ProjectInsightsProps {
  project: Project
  onInsightsChange?: (insights: any[] | null, activeInsight: number | null, scrollToInsight: ((insightIndex: number) => void) | null) => void
}

interface InsightKeyword {
  name: string
  weight: number
}

interface InsightQuote {
  text: string
  persona: string
}

interface InsightData {
  title: string
  summary: string
  keywords: InsightKeyword[]
  quotes: InsightQuote[]
  mentionCount: number
  priority: number
}

interface YearInsights {
  intervieweeCount: number
  insights: InsightData[]
}

interface ProcessedInsightData {
  [year: string]: YearInsights
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1']

export default function ProjectInsights({ project, onInsightsChange }: ProjectInsightsProps) {
  const { profile } = useAuth()
  const router = useRouter()
  const [currentInsight, setCurrentInsight] = useState(0)
  const [showDetailAnalysis, setShowDetailAnalysis] = useState(true)
  const [showRelatedKeywords, setShowRelatedKeywords] = useState(true)
  const [isHeaderFixed, setIsHeaderFixed] = useState(false)
  const insightHeaderRef = useRef<HTMLDivElement>(null)
  const insightRefs = useRef<{ [key: number]: HTMLDivElement }>({})
  
  // API를 통해 인사이트 데이터 가져오기
  const { data, isLoading, error } = useProjectInsights(project.id)
  
  // 현재 표시할 인사이트 데이터
  const processedInsightData = data?.insights || {}
  const availableYears = data?.years || []
  
  const [selectedYears, setSelectedYears] = useState<string[]>([])
  const [activeQuoteIndices, setActiveQuoteIndices] = useState<number[]>([])

  // selectedYears 초기화
  useEffect(() => {
    if (selectedYears.length === 0 && availableYears.length > 0 && availableYears[0]) {
      setSelectedYears([availableYears[0]])
    }
  }, [availableYears])
  
  // 현재 표시할 인사이트 (첫 번째 선택된 연도의 것을 표시)
  const currentYearData = selectedYears.length > 0 && selectedYears[0]
    ? (processedInsightData[selectedYears[0]] || { intervieweeCount: 0, insights: [] })
    : (availableYears[0] && processedInsightData[availableYears[0]] || { intervieweeCount: 0, insights: [] })

  // activeQuoteIndices 초기화를 위한 useEffect
  useEffect(() => {
    if (!currentYearData?.insights) {
      setActiveQuoteIndices([])
      return
    }
    
    setActiveQuoteIndices(currentYearData.insights.map(() => 0))
  }, [selectedYears[0]]) // currentYearData?.insights 제거
  
  // 롤링 배너 효과를 위한 인터벌 설정
  useEffect(() => {
    if (activeQuoteIndices.length === 0) return
    
    const interval = setInterval(() => {
      setActiveQuoteIndices(prev => 
        prev.map((idx, i) => {
          const insights = selectedYears.length > 0 && selectedYears[0] && processedInsightData[selectedYears[0]]?.insights
          const quotes = insights?.[i]?.quotes || []
          return quotes.length ? (idx + 1) % quotes.length : 0
        })
      )
    }, 5000)
    
    return () => clearInterval(interval)
  }, [activeQuoteIndices.length > 0, selectedYears[0]]) // 의존성 배열 수정
  
  // 스크롤 컨테이너 ref
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  // 스크롤 이벤트 리스너 추가
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return
    
    const handleScroll = () => {
      if (insightHeaderRef.current) {
        const headerPosition = insightHeaderRef.current.getBoundingClientRect().top
        setIsHeaderFixed(headerPosition <= 0)
      }
    }
    
    scrollContainer.addEventListener('scroll', handleScroll)
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [])

  // 연도 선택 토글 핸들러
  const toggleYear = (year: string) => {
    setSelectedYears(prev => {
      // 이미 선택된 연도인 경우 제거
      if (prev.includes(year)) {
        // 마지막 항목은 제거하지 않음 (최소 하나는 선택되어야 함)
        if (prev.length <= 1) return prev
        return prev.filter(y => y !== year)
      } 
      // 선택되지 않은 연도인 경우 추가
      else {
        return [...prev, year]
      }
    })
  }

  // 인사이트 네비게이션 처리
  const scrollToInsight = useCallback((insightIndex: number) => {
    const element = insightRefs.current[insightIndex]
    if (element) {
      element.scrollIntoView({ behavior: 'auto', block: 'start' })
    }
  }, [])

  // 인사이트 변경 통지
  useEffect(() => {
    if (!onInsightsChange) return
    
    const insights = selectedYears.length > 0 && selectedYears[0] && processedInsightData[selectedYears[0]]?.insights
    if (insights && insights.length > 0) {
      const insightsWithId = insights.map((insight, index) => ({
        ...insight,
        id: index
      }))
      onInsightsChange(insightsWithId, currentInsight, scrollToInsight)
    } else {
      onInsightsChange(null, null, null)
    }
  }, [selectedYears[0], currentInsight, onInsightsChange, scrollToInsight, processedInsightData])

  // persona 이름으로 인터뷰 찾기 및 상세보기로 이동
  const handleViewInterview = (interviewId: string) => {
    router.push(`/projects/${project.id}?interview=${interviewId}`)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-48 bg-gray-200 rounded-lg mb-6"></div>
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            인사이트를 불러오는 중 오류가 발생했습니다: {error.message}
          </AlertDescription>
        </Alert>
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={() => window.location.reload()}>다시 시도</Button>
        </div>
      </div>
    )
  }
  
  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">프로젝트 인사이트</h1>
          <p className="text-sm text-muted-foreground">연도별 인터뷰 데이터를 분석하고 인사이트를 확인하세요</p>
        </div>
      </div>

      {/* 연도별 선택과 인터뷰 고객 수를 묶어서 표시 */}
      <Card className="mb-5 shadow-sm border-gray-200 dark:border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">연간 인터뷰 현황</CardTitle>
              <CardDescription>
                원하는 연도를 선택하여 데이터를 확인하세요 (복수 선택 가능)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 연도 선택 드롭다운과 태그를 같은 줄에 배치 */}
          <div className="mb-5 flex flex-wrap gap-4 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-w-[180px] justify-between border-gray-200 dark:border-gray-800">
                  <span>
                    {selectedYears.length === 1 
                      ? `${selectedYears[0]}년` 
                      : `${selectedYears.length}개 연도 선택됨`}
                  </span>
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>연도 선택</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableYears.map((year) => (
                  <DropdownMenuCheckboxItem
                    key={year}
                    checked={selectedYears.includes(year)}
                    onCheckedChange={() => toggleYear(year)}
                    disabled={selectedYears.length === 1 && selectedYears.includes(year)}
                  >
                    {year}년 ({processedInsightData[year]?.intervieweeCount || 0}명)
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* 선택된 연도 태그 */}
            <div className="flex gap-2 flex-wrap">
              {selectedYears.map(year => (
                <Badge key={year} variant="outline" className="px-3 py-1 text-sm bg-primary/5 border-gray-200 dark:border-gray-800">
                  {year}년: <span className="font-bold ml-1">{processedInsightData[year]?.intervieweeCount || 0}명</span>
                </Badge>
              ))}
            </div>
          </div>
          
          {/* 주요 통계 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 완료된 인터뷰 수 */}
            <div className="flex items-center justify-center">
              <Card className="shadow-sm border-gray-200 dark:border-gray-800 h-full w-full">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <p className="text-4xl font-bold mb-3">
                    {selectedYears.reduce((total, year) => total + (processedInsightData[year]?.intervieweeCount || 0), 0)}
                  </p>
                  <p className="text-sm text-muted-foreground text-center font-medium">
                    완료된 인터뷰
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {/* 인사이트 수 */}
            <div className="flex items-center justify-center">
              <Card className="shadow-sm border-gray-200 dark:border-gray-800 h-full w-full">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <p className="text-4xl font-bold mb-3">
                    {selectedYears.reduce((total, year) => {
                      return total + (processedInsightData[year]?.insights?.length || 0)
                    }, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground text-center font-medium">
                    발견된 인사이트
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 종합 인사이트 요약 카드와 내용 */}
      {(() => {
        // 인터뷰 데이터가 있는지 먼저 확인
        const hasInterviews = selectedYears.some(year => 
          processedInsightData[year]?.intervieweeCount && processedInsightData[year].intervieweeCount > 0
        )
        
        // 인사이트 데이터가 있는지 확인
        const hasInsights = currentYearData?.insights && 
          Array.isArray(currentYearData.insights) && 
          currentYearData.insights.length > 0
        
        // 인터뷰가 없으면 인터뷰 없음 메시지
        if (!hasInterviews) {
          return false
        }
        
        // 인터뷰는 있지만 인사이트가 없으면 인사이트 없음 메시지는 아래에서 처리
        return hasInsights
      })() ? (
        <>
          <div className="grid grid-cols-1 gap-6 mb-5">
            {/* 종합 인사이트 요약 카드 - 직관적인 디자인 */}
            <Card className="shadow-sm border-gray-200 dark:border-gray-800" ref={insightHeaderRef}>
              <CardHeader>
                <CardTitle className="text-2xl font-bold">
                  {selectedYears.length === 1 
                    ? `${selectedYears[0]}년 주요 인사이트` 
                    : '선택된 연도의 주요 인사이트'}
                </CardTitle>
                <CardDescription>
                  아래에서 인사이트를 선택하면 상세 내용이 아래에 표시됩니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(currentYearData?.insights || []).map((insight: any, idx: number) => {
                    // 데이터 유효성 검사
                    if (!insight || typeof insight !== 'object') {
                      return null
                    }

                    const safeInsight = {
                      title: insight.title || `인사이트 ${idx + 1}`,
                      summary: insight.summary || '요약 정보가 없습니다.',
                      mentionCount: insight.mentionCount || 0,
                      quotes: Array.isArray(insight.quotes) ? insight.quotes : [],
                      keywords: Array.isArray(insight.keywords) ? insight.keywords : []
                    }

                    return (
                      <div 
                        key={idx} 
                        className={`relative border border-gray-200 dark:border-gray-800 rounded-lg transition-all cursor-pointer ${
                          currentInsight === idx 
                            ? 'border-primary bg-primary/5 shadow-sm' 
                            : 'border-gray-200 dark:border-gray-800 hover:border-primary/50 hover:bg-muted/30'
                        }`}
                        onClick={() => setCurrentInsight(idx)}
                      >
                        {/* 카드 숫자 표시 */}
                        <div className="absolute top-4 right-4 text-sm font-medium text-muted-foreground">
                          #{idx + 1}
                        </div>
                        
                        {currentInsight === idx && (
                          <Badge 
                            className="absolute -top-2 -right-2 bg-primary text-white" 
                            variant="default"
                          >
                            선택
                          </Badge>
                        )}
                        <div className="p-5">
                          <div className="font-medium text-base mb-2">{safeInsight.title}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2 mb-4">{safeInsight.summary}</div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <Badge variant="outline" className="bg-primary/5 border-primary/10">
                              <FileText className="w-3 h-3 mr-1" />
                              {safeInsight.mentionCount}명 언급
                            </Badge>
                            <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
                              <User className="w-3 h-3 mr-1" />
                              {safeInsight.quotes.length}개 인용
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 인사이트 상세 내용 */}
          <div className="space-y-6">
            {(currentYearData?.insights || []).map((insight: any, idx: number) => {
              // 데이터 유효성 검사
              if (!insight || typeof insight !== 'object') {
                return null
              }

              const safeInsight = {
                title: insight.title || `인사이트 ${idx + 1}`,
                summary: insight.summary || '요약 정보가 없습니다.',
                mentionCount: insight.mentionCount || 0,
                quotes: Array.isArray(insight.quotes) ? insight.quotes : [],
                keywords: Array.isArray(insight.keywords) ? insight.keywords : []
              }

              const topKeywords = safeInsight.keywords.slice(0, 8)
              const activeQuoteIndex = activeQuoteIndices[idx] || 0

              return (
                <Card 
                  key={idx} 
                  ref={el => { if (el) insightRefs.current[idx] = el }}
                  className={`transition-all duration-200 ${
                    currentInsight === idx 
                      ? 'shadow-md border-primary' 
                      : 'shadow-sm border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`
                          w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg
                          ${currentInsight === idx ? 'bg-primary' : 'bg-gray-400'}
                        `}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-xl">{safeInsight.title}</CardTitle>
                          <CardDescription className="mt-2">{safeInsight.summary}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {safeInsight.mentionCount}명 언급
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* 관련 키워드 섹션 */}
                    {showRelatedKeywords && topKeywords.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-600 mb-3">관련 키워드</h4>
                        <div className="flex flex-wrap gap-2">
                          {topKeywords.map((keyword: InsightKeyword, kidx: number) => (
                            <Badge 
                              key={kidx} 
                              variant="outline"
                              className="px-3 py-1"
                              style={{
                                backgroundColor: `${COLORS[kidx % COLORS.length]}10`,
                                borderColor: `${COLORS[kidx % COLORS.length]}40`,
                                color: COLORS[kidx % COLORS.length]
                              }}
                            >
                              {keyword.name}
                              <span className="ml-2 text-xs opacity-70">{keyword.weight}%</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 사용자 인용 섹션 */}
                    {showDetailAnalysis && safeInsight.quotes.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-600 mb-3">사용자 인용</h4>
                        <div className="relative bg-gray-50 rounded-lg p-6 border border-gray-200 dark:bg-gray-900 dark:border-gray-800">
                          <div className="absolute top-4 left-4 text-6xl text-gray-300 leading-none">"</div>
                          <div className="relative z-10 pl-8">
                            <p className="text-gray-700 italic mb-3 dark:text-gray-300 leading-relaxed">
                              {safeInsight.quotes[activeQuoteIndex]?.text || '인용구가 없습니다.'}
                            </p>
                            <p className="text-sm text-gray-500 font-medium">
                              - {safeInsight.quotes[activeQuoteIndex]?.persona || '알 수 없음'}
                            </p>
                          </div>
                          
                          {/* 인용 네비게이션 */}
                          {safeInsight.quotes.length > 1 && (
                            <div className="flex justify-center mt-4 gap-1">
                              {safeInsight.quotes.map((_: any, qidx: number) => (
                                <button
                                  key={qidx}
                                  className={`w-2 h-2 rounded-full transition-all ${
                                    qidx === activeQuoteIndex 
                                      ? 'bg-primary w-6' 
                                      : 'bg-gray-300 hover:bg-gray-400'
                                  }`}
                                  onClick={() => {
                                    setActiveQuoteIndices(prev => {
                                      const newIndices = [...prev]
                                      newIndices[idx] = qidx
                                      return newIndices
                                    })
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      ) : (
        <Card className="shadow-sm border-gray-200 dark:border-gray-800">
          <CardContent className="py-16 text-center">
            <div className="text-gray-400 mb-4">
              <BarChart3 className="w-16 h-16 mx-auto" />
            </div>
            <p className="text-lg font-medium text-gray-600 mb-2">
              {selectedYears.some(year => processedInsightData[year]?.intervieweeCount > 0)
                ? '인사이트 데이터가 없습니다'
                : '선택한 연도에 인터뷰 데이터가 없습니다'}
            </p>
            <p className="text-sm text-gray-500">
              {selectedYears.some(year => processedInsightData[year]?.intervieweeCount > 0)
                ? '인터뷰 데이터를 분석하여 인사이트를 생성해주세요.'
                : '다른 연도를 선택하거나 새로운 인터뷰를 추가해주세요.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 스티키 헤더 (Portal로 렌더링) */}
      {isHeaderFixed && typeof document !== 'undefined' && createPortal(
        <div className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 border-b shadow-sm z-20 px-8 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h3 className="font-semibold">
                {selectedYears.length === 1 
                  ? `${selectedYears[0]}년 인사이트` 
                  : '선택된 연도의 인사이트'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {currentYearData?.insights?.length || 0}개의 인사이트
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">
                인터뷰: {selectedYears.reduce((total, year) => total + (processedInsightData[year]?.intervieweeCount || 0), 0)}명
              </Badge>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}