'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, MessageCircle, User, BarChart3, TrendingUp, Users, Download, Search, Filter } from "lucide-react"
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
      return
    }

    async function loadAvailableYears() {
      try {
        console.log('연도 데이터 로드 중 - 프로젝트 단위:', project.name, 'ID:', project.id);
        
        if (!profile?.company_id) return;
        
        const response = await fetch(`/api/insights/years?company_id=${profile.company_id}&project_id=${project.id}`)
        if (response.ok) {
          const data = await response.json()
          setAvailableYears(data.years || [])
          
          console.log('연도 데이터 로드 완료:', data.years?.length || 0, '개');
        } else {
          console.error("연도 조회 실패")
          // 오류 시 현재 연도 기준 3년으로 fallback
          const currentYear = new Date().getFullYear()
          setAvailableYears([currentYear.toString(), (currentYear - 1).toString(), (currentYear - 2).toString()])
        }
      } catch (error) {
        console.error("연도 로드 오류:", error)
        // 오류 시 현재 연도 기준 3년으로 fallback
        const currentYear = new Date().getFullYear()
        setAvailableYears([currentYear.toString(), (currentYear - 1).toString(), (currentYear - 2).toString()])
      }
    }
    
    loadAvailableYears()
  }, [profile?.company_id, project?.id])

  // 인사이트 데이터 로드 (사용 가능한 연도가 로드된 후에 실행) - 프로젝트 단위
  useEffect(() => {
    if (availableYears.length === 0) return // 연도가 로드되지 않았으면 대기
    if (!profile?.company_id || !project?.id) return
    
    async function loadInsights() {
      try {
        setLoading(true)
        setError(null)
        
        console.log('인사이트 데이터 로드 중 - 프로젝트 단위:', project.name);
        
        if (!profile?.company_id) return;
        
        const yearDataPromises = availableYears.map(async (year) => {
          const response = await fetch(`/api/insights?company_id=${profile.company_id}&project_id=${project.id}&year=${year}`)
          if (response.ok) {
            const data = await response.json()
            return { year, data }
          }
          return { year, data: { intervieweeCount: 0, insights: [] } }
        })
        
        const yearResults = await Promise.all(yearDataPromises)
        const newInsightData: InsightApiData = {}
        
        yearResults.forEach(({ year, data }) => {
          newInsightData[year] = {
            intervieweeCount: data.intervieweeCount,
            insights: data.insights
          }
        })
        
        setInsightData(newInsightData)
        
        console.log('인사이트 데이터 로드 완료');
      } catch (error) {
        console.error("인사이트 데이터 로드 실패:", error)
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
  
  // 연도별 인터뷰 수 차트 데이터
  const yearChartData = selectedYears.map(year => ({
    year,
    count: insightData[year]?.intervieweeCount || 0
  }))

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">프로젝트 인터뷰 현황</CardTitle>
              <CardDescription>
                {project.name} 프로젝트의 연도별 인터뷰 데이터를 확인하세요 (복수 선택 가능)
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">프로젝트</div>
              <div className="font-medium text-primary">{project.name}</div>
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
      {currentYearData?.insights && currentYearData.insights.length > 0 ? (
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
                  {(currentYearData?.insights || []).map((insight, idx) => (
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
                        <div className="font-medium text-base mb-2">{insight.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-2 mb-4">{insight.summary}</div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Badge variant="outline" className="bg-primary/5 border-primary/10">
                            언급 {insight.mentionCount}회
                          </Badge>
                          <Badge variant="outline" className="bg-primary/5 border-primary/10">
                            고객 {new Set(insight.quotes.map(q => q.persona)).size}명
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* 고정 네비게이션 */}
          {isHeaderFixed && (
            <div className="fixed top-0 left-0 right-0 bg-background z-50 shadow-md border-b border-gray-200 dark:border-gray-800 py-3 transform transition-transform">
              <div className="container mx-auto px-4">
                <div className="flex justify-center items-center">
                  <div className="flex gap-2 overflow-auto pb-1">
                    {(currentYearData?.insights || []).map((insight, idx) => (
                      <Button 
                        key={idx} 
                        variant={currentInsight === idx ? "default" : "outline"} 
                        className="text-xs h-8 px-2 whitespace-nowrap"
                        onClick={() => setCurrentInsight(idx)}
                      >
                        {insight.title}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 선택된 인사이트 상세 보기 */}
          {currentYearData?.insights && currentYearData.insights[currentInsight] && (
            <Card className="mb-5 shadow-sm border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">
                  {currentYearData.insights[currentInsight].title}
                </CardTitle>
                <CardDescription>
                  {currentYearData.insights[currentInsight].summary}
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
                              프로젝트 "{project.name}"에서 공통적으로 강조된 "{currentYearData.insights[currentInsight].title}"에 대한 분석입니다. 
                              {currentYearData.insights[currentInsight].summary}
                            </p>
                            <p className="text-sm leading-relaxed">
                              이 인사이트는 총 {currentYearData.insights[currentInsight].mentionCount}회 언급되었으며, 
                              {new Set(currentYearData.insights[currentInsight].quotes.map(q => q.persona)).size}명의 고객으로부터 {currentYearData.insights[currentInsight].quotes.length}개의 관련 의견이 수집되었습니다. 
                              주요 키워드로는 "{currentYearData.insights[currentInsight].keywords.slice(0, 3).map(k => k.name).join('", "')}" 등이 
                              핵심 요소로 확인되었습니다.
                            </p>
                            <div>
                              {currentYearData.insights[currentInsight].keywords.slice(0, 3).map((keyword, idx) => (
                                <Badge key={idx} className="bg-primary/10 text-primary hover:bg-primary/20 border-none mr-2">
                                  {keyword.name} ({keyword.weight}%)
                                </Badge>
                              ))}
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
                              <PieChart>
                                <Pie
                                  data={currentYearData.insights[currentInsight].keywords}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, weight }) => `${name} ${weight}%`}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="weight"
                                >
                                  {currentYearData.insights[currentInsight].keywords.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value) => [`${value}%`, '비중']} />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
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
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentYearData.insights[currentInsight].quotes.map((quote, i) => (
                      <Card key={i} className="shadow-sm border-gray-200 dark:border-gray-800">
                        <CardContent className="p-4 flex flex-col" style={{ minHeight: '200px' }}>
                          <div className="flex-grow">
                            <p className="text-base">"{quote.text}"</p>
                          </div>
                          <div className="pt-2 border-t mt-auto">
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                                  <User className="h-4 w-4 text-primary" />
                                </div>
                                <p className="text-sm text-muted-foreground">{quote.persona}</p>
                              </div>
                              <Button size="sm" variant="outline" className="gap-1 text-sm font-medium bg-white dark:bg-zinc-950" asChild>
                                <Link href="/chat">
                                  <MessageCircle className="h-3 w-3" />
                                  <span>대화하기</span>
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="py-16 shadow-sm border-gray-200 dark:border-gray-800">
          <div className="text-center text-muted-foreground">
            <p className="mb-4">이 프로젝트에 대한 인터뷰가 없습니다.</p>
            <Button variant="outline" className="border-gray-200 dark:border-gray-800" onClick={() => setSelectedYears(["2024"])}>
              2024년 보기
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
} 