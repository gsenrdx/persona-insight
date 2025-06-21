'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, FileText, User, BarChart3, TrendingUp, Users, Download, Search, Filter } from "lucide-react"
import { useAuth } from '@/hooks/use-auth'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

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

interface InsightApiData {
  [year: string]: YearInsights
}

interface KeywordInsight {
  keyword: string
  frequency: number
  sentiment: 'positive' | 'negative' | 'neutral'
  context: string[]
}

interface CustomerQuote {
  quote: string
  interviewee: string
  date: string
  persona: string
  sentiment: 'positive' | 'negative' | 'neutral'
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1']

export default function ProjectInsights({ project }: ProjectInsightsProps) {
  const { profile } = useAuth()
  const router = useRouter()
  const [currentInsight, setCurrentInsight] = useState(0)
  const [showDetailAnalysis, setShowDetailAnalysis] = useState(true)
  const [showRelatedKeywords, setShowRelatedKeywords] = useState(true)
  const [isHeaderFixed, setIsHeaderFixed] = useState(false)
  const [insightData, setInsightData] = useState<InsightApiData>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const insightHeaderRef = useRef<HTMLDivElement>(null)
  
  // 실제 데이터가 있는 연도들 (동적으로 가져옴)
  const [availableYears, setAvailableYears] = useState<string[]>([])
  const [selectedYears, setSelectedYears] = useState<string[]>([])
  const [activeQuoteIndices, setActiveQuoteIndices] = useState<number[]>([])
  const [insights, setInsights] = useState<KeywordInsight[]>([])
  const [quotes, setQuotes] = useState<CustomerQuote[]>([])

  // 사용 가능한 연도 먼저 로드 (프로젝트 단위)
  useEffect(() => {
    if (!profile?.company_id || !project?.id) {
      setLoading(false)
      return
    }

    async function loadAvailableYears() {
      try {
        const response = await fetch(`/api/insights/years?company_id=${profile?.company_id}&project_id=${project.id}`)
        if (response.ok) {
          const data = await response.json()
          const years = data.years || []
          setAvailableYears(years)
          
          // API에서 연도 목록이 비어있으면 빈 데이터로 설정하고 로딩 완료
          if (years.length === 0) {
            setInsightData({})
            setLoading(false)
          }
        } else {
          // API 실패 시 빈 데이터로 설정하고 로딩 완료
          setAvailableYears([])
          setInsightData({})
          setLoading(false)
        }
      } catch (error) {
        // 연도 로드 실패
        // 오류 시 빈 데이터로 설정하고 로딩 완료
        setAvailableYears([])
        setInsightData({})
        setLoading(false)
      }
    }
    
    loadAvailableYears()
  }, [profile?.company_id, project?.id])

  // 인사이트 데이터 로드 (사용 가능한 연도가 로드된 후에 실행) - 프로젝트 단위
  useEffect(() => {
    // 연도 목록이 비어있으면 로딩 완료 (이미 첫 번째 useEffect에서 처리됨)
    if (availableYears.length === 0) return
    if (!profile?.company_id || !project?.id) return
    
    async function loadInsights() {
      try {
        setLoading(true)
        setError(null)
        
        const yearDataPromises = availableYears.map(async (year) => {
          try {
            const response = await fetch(`/api/insights?company_id=${profile?.company_id}&project_id=${project.id}&year=${year}`)
            if (response.ok) {
              const data = await response.json()
              return { year, data }
            }
            return { year, data: { intervieweeCount: 0, insights: [] } }
          } catch (err) {
            // 인사이트 로드 실패
            return { year, data: { intervieweeCount: 0, insights: [] } }
          }
        })
        
        const yearResults = await Promise.all(yearDataPromises)
        const newInsightData: InsightApiData = {}
        
        yearResults.forEach(({ year, data }) => {
          newInsightData[year] = {
            intervieweeCount: data.intervieweeCount || 0,
            insights: data.insights || []
          }
        })
        
        setInsightData(newInsightData)
        
      } catch (error) {
        // 인사이트 데이터 로드 실패
        setError('인사이트 데이터를 불러오는데 실패했습니다')
        // 오류 시 빈 데이터로 초기화
        const emptyData: InsightApiData = {}
        availableYears.forEach(year => {
          emptyData[year] = { intervieweeCount: 0, insights: [] }
        })
        setInsightData(emptyData)
      } finally {
        setLoading(false)
      }
    }
    
    loadInsights()
  }, [availableYears, profile?.company_id, project?.id])

  // selectedYears 초기화
  useEffect(() => {
    if (selectedYears.length === 0 && availableYears.length > 0) {
      setSelectedYears([availableYears[0]])
    }
  }, [availableYears, selectedYears.length])
  
  // 현재 표시할 인사이트 (첫 번째 선택된 연도의 것을 표시)
  const currentYearData = selectedYears.length > 0 
    ? (insightData[selectedYears[0]] || { intervieweeCount: 0, insights: [] })
    : (insightData[availableYears[0]] || { intervieweeCount: 0, insights: [] })


  // 롤링 배너 효과를 위한 인터벌 설정
  useEffect(() => {
    if (selectedYears.length === 0 || !currentYearData?.insights) return
    
    // activeQuoteIndices 초기화
    if (activeQuoteIndices.length !== currentYearData.insights.length) {
      setActiveQuoteIndices(currentYearData.insights.map(() => 0))
    }
    
    const interval = setInterval(() => {
      setActiveQuoteIndices(prev => 
        prev.map((idx, i) => {
          const quotes = currentYearData?.insights[i]?.quotes || []
          return quotes.length ? (idx + 1) % quotes.length : 0
        })
      )
    }, 5000)
    
    return () => clearInterval(interval)
  }, [selectedYears, currentYearData, activeQuoteIndices.length])
  
  // 스크롤 이벤트 리스너 추가
  useEffect(() => {
    const handleScroll = () => {
      if (insightHeaderRef.current) {
        const headerPosition = insightHeaderRef.current.getBoundingClientRect().top
        setIsHeaderFixed(headerPosition <= 0)
      }
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
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

  // persona 이름으로 인터뷰 찾기 및 상세보기로 이동
  const handleViewInterview = async (personaName: string) => {
    try {
      // 해당 프로젝트의 인터뷰 목록에서 persona 이름으로 검색
      const response = await fetch(`/api/interviews?company_id=${profile?.company_id}&project_id=${project.id}`)
      if (response.ok) {
        const { data } = await response.json()
        // interviewee_fake_name 또는 personas.persona_title과 매칭
        const interview = data?.find((item: any) => 
          item.interviewee_fake_name === personaName || 
          item.personas?.persona_title === personaName ||
          item.personas?.persona_type === personaName
        )
        
        if (interview) {
          // 프로젝트 페이지로 이동하면서 쿼리스트링으로 인터뷰 ID 전달
          router.push(`/projects/${project.id}?interview=${interview.id}`)
        } else {
          // 인터뷰를 찾지 못한 경우 프로젝트 페이지로만 이동
          router.push(`/projects/${project.id}`)
        }
      }
    } catch (error) {
      // 인터뷰 검색 중 오류
      // 오류 발생 시에도 프로젝트 페이지로 이동
      router.push(`/projects/${project.id}`)
    }
  }
  

  if (loading) {
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
      <div className="text-center py-16">
        <p className="text-red-500 mb-4">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>다시 시도</Button>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* 연도별 선택과 인터뷰 고객 수를 묶어서 표시 */}
      <Card className="shadow-sm border-gray-200 dark:border-gray-800">
        <CardHeader>
          <div>
            <CardTitle className="text-2xl font-bold">프로젝트 인터뷰 현황</CardTitle>
            <CardDescription>
              {project.name} 프로젝트의 연도별 인터뷰 데이터를 확인하세요 (복수 선택 가능)
            </CardDescription>
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
                    {year}년 ({insightData[year]?.intervieweeCount || 0}명)
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* 선택된 연도 태그 */}
            <div className="flex gap-2 flex-wrap">
              {selectedYears.map(year => (
                <Badge key={year} variant="outline" className="px-3 py-1 text-sm bg-primary/5 border-gray-200 dark:border-gray-800">
                  {year}년: <span className="font-bold ml-1">{insightData[year]?.intervieweeCount || 0}명</span>
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
                    {selectedYears.reduce((total, year) => total + (insightData[year]?.intervieweeCount || 0), 0)}
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
                      return total + (insightData[year]?.insights?.length || 0)
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
          insightData[year]?.intervieweeCount > 0
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
                  {(currentYearData?.insights || []).map((insight, idx) => {
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
                              언급 {safeInsight.mentionCount}회
                            </Badge>
                            <Badge variant="outline" className="bg-primary/5 border-primary/10">
                              고객 {new Set(safeInsight.quotes.map(q => q?.persona).filter(Boolean)).size}명
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
          
          {/* 고정 네비게이션 - Portal을 사용하여 body에 직접 렌더링 */}
          {isHeaderFixed && typeof window !== 'undefined' && createPortal(
            <div 
              className="fixed top-0 left-0 right-0 bg-background shadow-md border-b border-gray-200 dark:border-gray-800 py-3"
              style={{
                zIndex: 1000,
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0
              }}
            >
              <div className="w-full px-4">
                <div className="flex justify-center items-center">
                  <div className="flex gap-2 overflow-auto pb-1 w-full justify-center">
                    {(currentYearData?.insights || []).map((insight, idx) => {
                      const isSelected = currentInsight === idx
                      return (
                        <Button 
                          key={idx} 
                          ref={isSelected ? (el) => el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }) : undefined}
                          variant={isSelected ? "default" : "outline"} 
                          className="text-xs h-8 px-2 whitespace-nowrap flex-shrink-0"
                          onClick={() => setCurrentInsight(idx)}
                        >
                          {insight?.title || `인사이트 ${idx + 1}`}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}
          
          {/* 선택된 인사이트 상세 보기 */}
          {currentYearData?.insights && Array.isArray(currentYearData.insights) && currentYearData.insights[currentInsight] && (() => {
            const selectedInsight = currentYearData.insights[currentInsight]
            
            // 안전한 데이터 구조 생성
            const safeSelectedInsight = {
              title: selectedInsight?.title || `인사이트 ${currentInsight + 1}`,
              summary: selectedInsight?.summary || '요약 정보가 없습니다.',
              keywords: Array.isArray(selectedInsight?.keywords) ? selectedInsight.keywords : [],
              quotes: Array.isArray(selectedInsight?.quotes) ? selectedInsight.quotes : [],
              mentionCount: selectedInsight?.mentionCount || 0,
              priority: selectedInsight?.priority || 1
            }
            
            return (
              <Card className="mb-5 shadow-sm border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold">
                    {safeSelectedInsight.title}
                  </CardTitle>
                  <CardDescription>
                    {safeSelectedInsight.summary}
                  </CardDescription>
                </CardHeader>
            
              {/* 인사이트 상세 보기 */}
              <CardContent className="pb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 md:items-start">
                  {/* 인사이트 상세 요약 */}
                  <div>
                    <Card className="shadow-sm border-gray-200 dark:border-gray-800">
                      <CardHeader className="cursor-pointer flex flex-row items-center justify-between" onClick={() => setShowDetailAnalysis(!showDetailAnalysis)}>
                        <CardTitle className="text-lg font-medium">상세 분석</CardTitle>
                        <ChevronDown className={`h-4 w-4 transition-transform ${showDetailAnalysis ? '' : 'transform rotate-180'}`} />
                      </CardHeader>
                      {showDetailAnalysis && (
                        <CardContent>
                          <div className="space-y-4">
                            <p className="text-sm leading-relaxed">
                              프로젝트 "{project.name}"에서 공통적으로 강조된 "{safeSelectedInsight.title}"에 대한 분석입니다. 
                              {safeSelectedInsight.summary}
                            </p>
                            <p className="text-sm leading-relaxed">
                              이 인사이트는 총 {safeSelectedInsight.mentionCount}회 언급되었으며, 
                              {new Set(safeSelectedInsight.quotes.map(q => q?.persona).filter(Boolean)).size}명의 고객으로부터 {safeSelectedInsight.quotes.length}개의 관련 의견이 수집되었습니다. 
                              주요 키워드로는 "{safeSelectedInsight.keywords.slice(0, 3).map(k => k?.name).filter(Boolean).join('", "')}" 등이 
                              핵심 요소로 확인되었습니다.
                            </p>
                            <p className="text-sm leading-relaxed">
                              특히 "{safeSelectedInsight.keywords[0]?.name}" 키워드가 가장 높은 비중({safeSelectedInsight.keywords[0]?.weight}%)을 차지하며, 
                              이는 고객들이 가장 중요하게 여기는 부분임을 시사합니다. 
                              {safeSelectedInsight.priority <= 3 ? 
                                '높은 우선순위를 가진 이 인사이트는 즉시 개선이 필요한 영역으로 판단됩니다.' :
                                safeSelectedInsight.priority <= 7 ?
                                '중간 우선순위를 가진 이 인사이트는 중장기적 개선 계획에 포함되어야 할 요소입니다.' :
                                '이 인사이트는 장기적 관점에서 지속적인 모니터링과 개선이 필요한 영역입니다.'
                              }
                            </p>
                            <div>
                              {safeSelectedInsight.keywords.slice(0, 3).map((keyword, idx) => 
                                keyword?.name ? (
                                  <Badge key={idx} className="bg-primary/10 text-primary hover:bg-primary/20 border-none mr-2">
                                    {keyword.name} ({keyword.weight || 0}%)
                                  </Badge>
                                ) : null
                              )}
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  </div>
                  
                  {/* 키워드 원형 그래프 */}
                  <div>
                    <Card className="shadow-sm border-gray-200 dark:border-gray-800">
                      <CardHeader className="cursor-pointer flex flex-row items-center justify-between" onClick={() => setShowRelatedKeywords(!showRelatedKeywords)}>
                        <CardTitle className="text-lg font-medium">관련 키워드</CardTitle>
                        <ChevronDown className={`h-4 w-4 transition-transform ${showRelatedKeywords ? '' : 'transform rotate-180'}`} />
                      </CardHeader>
                      {showRelatedKeywords && (
                        <CardContent>
                          <div className="w-full h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart margin={{ top: 20, right: 20, bottom: 30, left: 20 }}>
                                <Pie
                                  data={safeSelectedInsight.keywords}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  outerRadius={90}
                                  fill="#8884d8"
                                  dataKey="weight"
                                  nameKey="name"
                                  label={({ name }) => name}
                                  isAnimationActive={false}
                                >
                                  {safeSelectedInsight.keywords.map((_, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={[
                                        'hsl(var(--primary) / 0.85)',
                                        'hsl(215, 70%, 60%)',
                                        'hsl(260, 60%, 65%)',
                                        'hsl(330, 65%, 65%)'
                                      ][index % 4]} 
                                    />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value: number, name: string) => [`${value}%`, name]} />
                                <Legend verticalAlign="bottom" height={36} iconSize={12} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <style jsx global>{`
                            .recharts-default-legend {
                              font-size: 12px;
                              margin-top: 10px !important; 
                            }
                            .recharts-legend-item {
                              margin-right: 15px !important;
                            }
                            .recharts-text {
                              font-size: 11px;
                            }
                          `}</style>
                        </CardContent>
                      )}
                    </Card>
                  </div>
                </div>
                
                {/* 구분선 */}
                <div className="border-t border-gray-200 dark:border-gray-800 my-6"></div>
                
                {/* 고객 이야기 섹션 */}
                <div>
                  <div className="flex justify-between items-center mb-5">
                    <div>
                      <h3 className="text-xl font-bold">인사이트와 연관된 고객의 한마디</h3>
                    </div>
                    
                    {/* 필터 */}
                    <div className="flex flex-wrap gap-3 items-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="h-9 px-3 justify-between border-gray-200 dark:border-gray-800">
                            <span className="text-sm">고객 유형</span>
                            <ChevronDown className="h-4 w-4 ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                          <DropdownMenuLabel>고객 유형 필터</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuCheckboxItem checked={true}>
                            모든 고객
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem>
                            학생
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem>
                            직장인
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem>
                            주부
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem>
                            노년층
                          </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="h-9 px-3 justify-between border-gray-200 dark:border-gray-800">
                            <span className="text-sm">정렬 기준</span>
                            <ChevronDown className="h-4 w-4 ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                          <DropdownMenuLabel>정렬 기준</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuCheckboxItem checked={true}>
                            최신순
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem>
                            페르소나순
                          </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {safeSelectedInsight.quotes.map((quote, i) => {
                      // 인용구 데이터 유효성 검사
                      if (!quote || typeof quote !== 'object') {
                        return null
                      }
                      
                      const safeQuote = {
                        text: quote.text || '인용구 내용이 없습니다.',
                        persona: quote.persona || `고객 ${i + 1}`
                      }
                      
                      return (
                        <Card key={i} className="shadow-sm border-gray-200 dark:border-gray-800">
                          <CardContent className="p-4 flex flex-col" style={{ minHeight: '200px' }}>
                            <div className="flex-grow">
                              <p className="text-base">"{safeQuote.text}"</p>
                            </div>
                            <div className="pt-2 border-t mt-auto">
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center">
                                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                                    <User className="h-4 w-4 text-primary" />
                                  </div>
                                  <p className="text-sm text-muted-foreground">{safeQuote.persona}</p>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="gap-1 text-sm font-medium bg-white dark:bg-zinc-950"
                                  onClick={() => handleViewInterview(safeQuote.persona)}
                                >
                                  <FileText className="h-3 w-3" />
                                  <span>인터뷰 상세보기</span>
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
            )
          })()}
        </>
      ) : (
        (() => {
          // 인터뷰 데이터가 있는지 확인
          const hasInterviews = selectedYears.some(year => 
            insightData[year]?.intervieweeCount > 0
          )
          

          if (!hasInterviews) {
            // 인터뷰가 없는 경우
            return (
              <Card className="py-16 shadow-sm border-gray-200 dark:border-gray-800">
                <div className="text-center text-muted-foreground">
                  <p className="mb-4">이 프로젝트에 대한 인터뷰가 없습니다.</p>
                  <p className="text-sm mb-4">인터뷰를 업로드하여 인사이트를 생성해보세요.</p>
                </div>
              </Card>
            )
          } else {
            // 인터뷰는 있지만 인사이트가 없는 경우
            return (
              <Card className="py-16 shadow-sm border-gray-200 dark:border-gray-800">
                <div className="text-center text-muted-foreground">
                  <p className="mb-4">선택된 연도에 대한 인사이트 데이터가 없습니다.</p>
                  <p className="text-sm mb-4">인터뷰 분석이 완료되면 인사이트가 생성됩니다.</p>
                </div>
              </Card>
            )
          }
        })()
      )}
    </div>
  )
} 