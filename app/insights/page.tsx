"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts"
import { User, ChevronRight, MessageCircle, Check, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type Keyword = {
  name: string;
  weight: number;
}

type Quote = {
  text: string;
  persona: string;
}

type Insight = {
  title: string;
  summary: string;
  keywords: Keyword[];
  quotes: Quote[];
  mentionCount: number;
  priority: number;
}

type YearData = {
  intervieweeCount: number;
  insights: Insight[];
}

type InsightData = {
  [year: string]: YearData;
}

export default function InsightsPage() {
  const [currentInsight, setCurrentInsight] = useState(0)
  const [showDetailAnalysis, setShowDetailAnalysis] = useState(true)
  const [showRelatedKeywords, setShowRelatedKeywords] = useState(true)
  const [isHeaderFixed, setIsHeaderFixed] = useState(false)
  const insightHeaderRef = useRef<HTMLDivElement>(null)
  
  // 샘플 데이터
  const years = ["2023", "2022", "2021"]
  const insightData: InsightData = {
    "2023": {
      intervieweeCount: 45,
      insights: [
        {
          title: "사용성 중심 개선 요구",
          summary: "사용자들은 복잡한 인터페이스보다 직관적인 디자인과 쉬운 사용성을 중요시함",
          keywords: [
            { name: "직관적 UI", weight: 73 },
            { name: "사용성", weight: 68 },
            { name: "간결함", weight: 52 },
            { name: "쉬운 접근성", weight: 49 },
          ],
          quotes: [
            { text: "처음 봐도 어디를 눌러야 할지 바로 알 수 있었으면 좋겠어요", persona: "직장인 A" },
            { text: "너무 많은 옵션이 한 화면에 있으면 혼란스러워요", persona: "학생 B" },
            { text: "복잡한 메뉴 구조보다 자주 쓰는 기능이 바로 보이면 좋겠어요", persona: "주부 C" },
            { text: "한눈에 봐도 이해할 수 있는 UI가 제일 좋아요", persona: "프리랜서 D" },
            { text: "클릭해야 하는 단계가 많으면 포기하게 돼요", persona: "직장인 E" },
            { text: "메뉴 이름이 직관적이지 않으면 찾기 어려워요", persona: "학생 F" },
            { text: "화면이 너무 복잡하면 정신이 없어요", persona: "주부 G" },
            { text: "어디를 눌러야 원하는 기능을 찾을 수 있는지 쉽게 알아볼 수 있어야 해요", persona: "50대 H" },
            { text: "처음 사용하는 사람도 헤매지 않는 디자인이 좋아요", persona: "60대 I" }
          ],
          mentionCount: 36,
          priority: 1
        },
        {
          title: "모바일 최적화 필요성",
          summary: "주 사용자층은 모바일에서 서비스를 이용하며, 모바일 환경에 최적화된 경험을 원함",
          keywords: [
            { name: "모바일 친화적", weight: 82 },
            { name: "반응형 디자인", weight: 65 },
            { name: "빠른 로딩속도", weight: 58 },
            { name: "터치 인터페이스", weight: 47 },
          ],
          quotes: [
            { text: "출퇴근 시간에 주로 휴대폰으로 보는데 화면이 너무 작게 나와요", persona: "회사원 D" },
            { text: "모바일에서 버튼 누르기가 너무 어려워요, 좀 더 크게 만들어주세요", persona: "노년층 E" },
            { text: "앱이 자주 멈춰서 사용하기 불편해요", persona: "대학생 F" },
            { text: "스마트폰으로 볼 때 글씨가 너무 작아요", persona: "30대 G" },
            { text: "모바일에서 화면이 잘 보이지 않아요", persona: "40대 H" },
            { text: "터치하기 쉽게 버튼 간격을 넓혀주세요", persona: "50대 I" },
            { text: "모바일에서 이용할 때 스크롤이 너무 많이 필요해요", persona: "20대 J" },
            { text: "스마트폰에서도 PC와 동일한 기능을 모두 사용하고 싶어요", persona: "직장인 K" },
            { text: "모바일에서 이미지가 제대로 보이지 않아요", persona: "학생 L" }
          ],
          mentionCount: 31,
          priority: 2
        },
        {
          title: "개인화 서비스 요구",
          summary: "사용자들은 자신의 취향과 패턴을 학습하는 맞춤형 서비스를 기대함",
          keywords: [
            { name: "맞춤 추천", weight: 76 },
            { name: "개인화", weight: 71 },
            { name: "사용자 학습", weight: 55 },
            { name: "취향 분석", weight: 52 },
          ],
          quotes: [
            { text: "내가 평소에 좋아하는 스타일을 자동으로 추천해주면 좋겠어요", persona: "20대 G" },
            { text: "매번 같은 설정을 해야 하는 게 번거로워요", persona: "직장인 H" },
            { text: "내 취향을 기억해주는 서비스가 늘어났으면 좋겠어요", persona: "30대 I" },
            { text: "자주 사용하는 기능을 메인에 배치해주면 좋겠어요", persona: "학생 J" },
            { text: "나의 사용 패턴을 분석해서 맞춤 추천해주면 좋겠어요", persona: "직장인 K" },
            { text: "내가 관심 있을 만한 콘텐츠만 보여주세요", persona: "40대 L" },
            { text: "사용할수록 더 정확한 추천이 되었으면 좋겠어요", persona: "20대 M" },
            { text: "나만의 맞춤 설정을 여러 개 저장해두고 싶어요", persona: "디자이너 N" },
            { text: "내 스타일에 맞는 인터페이스로 자동 변경되면 좋겠어요", persona: "30대 O" }
          ],
          mentionCount: 27,
          priority: 3
        },
        {
          title: "데이터 보안 우려",
          summary: "개인정보 보호와 데이터 보안에 대한 우려가 높아지고 있음",
          keywords: [
            { name: "개인정보 보호", weight: 79 },
            { name: "투명성", weight: 67 },
            { name: "데이터 관리", weight: 61 },
            { name: "신뢰도", weight: 58 },
          ],
          quotes: [
            { text: "내 정보가 어디에 어떻게 사용되는지 명확히 알고 싶어요", persona: "40대 J" },
            { text: "개인정보 수집 범위가 너무 광범위한 것 같아요", persona: "회사원 K" },
            { text: "로그인 없이도 사용할 수 있는 기능이 많았으면 좋겠어요", persona: "학생 L" },
            { text: "내 정보가 제3자에게 공유되는지 걱정돼요", persona: "30대 M" },
            { text: "개인정보 처리방침이 너무 복잡해서 이해하기 어려워요", persona: "직장인 N" },
            { text: "데이터 삭제 요청을 쉽게 할 수 있었으면 좋겠어요", persona: "50대 O" },
            { text: "어떤 데이터가 수집되는지 선택할 수 있으면 좋겠어요", persona: "20대 P" },
            { text: "내 정보 보호에 더 신경 써주세요", persona: "60대 Q" },
            { text: "로그인할 때마다 보안 인증이 너무 번거로워요", persona: "학생 R" }
          ],
          mentionCount: 23,
          priority: 4
        },
        {
          title: "통합 서비스 선호",
          summary: "여러 기능을 하나의 플랫폼에서 이용할 수 있는 통합 서비스에 대한 선호도가 높음",
          keywords: [
            { name: "올인원", weight: 72 },
            { name: "통합 경험", weight: 65 },
            { name: "편리함", weight: 63 },
            { name: "다기능성", weight: 54 },
          ],
          quotes: [
            { text: "하나의 앱에서 모든 것을 해결할 수 있으면 좋겠어요", persona: "회사원 M" },
            { text: "여러 앱을 오가며 사용하는 것이 번거로워요", persona: "자영업자 N" },
            { text: "로그인도 한번만 하고 여러 서비스를 이용하고 싶어요", persona: "주부 O" },
            { text: "모든 기능이 한 곳에 모여있으면 편리할 것 같아요", persona: "학생 P" },
            { text: "관련 서비스를 왔다갔다하지 않고 한 번에 처리하고 싶어요", persona: "직장인 Q" },
            { text: "여러 계정을 만들지 않고 하나로 모든 서비스를 이용하고 싶어요", persona: "50대 R" },
            { text: "다양한 기능이 통합되어 있으면서도 복잡하지 않았으면 좋겠어요", persona: "30대 S" },
            { text: "자주 사용하는 서비스들이 하나로 통합되면 좋겠어요", persona: "20대 T" },
            { text: "여러 기능을 번갈아가며 사용할 때도 흐름이 끊기지 않았으면 해요", persona: "디자이너 U" }
          ],
          mentionCount: 20,
          priority: 5
        },
        {
          title: "지속적인 업데이트 요구",
          summary: "사용자들은 꾸준한 기능 업데이트와 개선을 기대함",
          keywords: [
            { name: "새로운 기능", weight: 68 },
            { name: "버그 수정", weight: 65 },
            { name: "성능 개선", weight: 62 },
            { name: "정기 업데이트", weight: 51 },
          ],
          quotes: [
            { text: "몇 달 동안 업데이트가 없으면 서비스가 관리되지 않는다는 느낌이 들어요", persona: "20대 P" },
            { text: "같은 버그가 계속 반복되는 것이 실망스러워요", persona: "IT 종사자 Q" },
            { text: "경쟁사는 계속 새로운 기능을 추가하는데 뒤처지는 것 같아요", persona: "30대 R" },
            { text: "사용자 의견을 반영한 개선이 자주 이루어졌으면 해요", persona: "대학생 S" },
            { text: "업데이트 후에 성능이 더 나빠지는 경우가 있어요", persona: "직장인 T" },
            { text: "정기적으로 새로운 기능이 추가되면 계속 사용하게 돼요", persona: "프리랜서 U" },
            { text: "업데이트 내역을 쉽게 확인하고 싶어요", persona: "40대 V" },
            { text: "베타 테스트에 참여할 수 있는 기회가 있으면 좋겠어요", persona: "개발자 W" },
            { text: "오래된 기능도 꾸준히 개선해주세요", persona: "50대 X" }
          ],
          mentionCount: 17,
          priority: 6
        }
      ]
    },
    "2022": {
      intervieweeCount: 38,
      insights: []
    },
    "2021": {
      intervieweeCount: 31,
      insights: []
    }
  }
  
  // 다중 선택 연도 관리를 위한 상태 배열
  const [selectedYears, setSelectedYears] = useState<string[]>(["2023"])
  const [activeQuoteIndices, setActiveQuoteIndices] = useState<number[]>(
    insightData["2023"].insights.map(() => 0)
  )
  
  // 선택된 연도들의 총 인터뷰 고객 수 계산
  const totalInterviewees = selectedYears.reduce(
    (total, year) => total + insightData[year].intervieweeCount, 
    0
  )
  
  // 현재 표시할 인사이트 (첫 번째 선택된 연도의 것을 표시)
  const currentYearData = selectedYears.length > 0 
    ? insightData[selectedYears[0]] 
    : insightData["2023"]
  
  // 롤링 배너 효과를 위한 인터벌 설정
  useEffect(() => {
    if (selectedYears.length === 0) return
    
    const interval = setInterval(() => {
      setActiveQuoteIndices(prev => 
        prev.map((idx, i) => {
          const quotes = currentYearData?.insights[i]?.quotes || []
          return quotes.length ? (idx + 1) % quotes.length : 0
        })
      )
    }, 5000)
    
    return () => clearInterval(interval)
  }, [selectedYears, currentYearData])
  
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
    count: insightData[year].intervieweeCount
  }))
  
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
  
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-blue-50/80 to-blue-100/30 dark:from-blue-950/5 dark:to-blue-900/10">
      {/* 배경 장식 요소 */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
      <div className="absolute top-20 -left-96 w-[800px] h-[800px] rounded-full bg-blue-100/40 dark:bg-blue-500/5 blur-3xl" />
      <div className="absolute top-1/2 -right-96 w-[600px] h-[600px] rounded-full bg-blue-100/40 dark:bg-blue-500/5 blur-3xl" />
      
      {/* 헤더 */}
      <header className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex items-baseline">
              <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Persona Insight</h2>
              <span className="ml-2 text-xs text-muted-foreground">by MISO1004</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="text-sm font-medium bg-white dark:bg-zinc-950" asChild>
              <Link href="/" className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                고객과 대화하기
              </Link>
            </Button>
            <ModeToggle />
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 pt-0 pb-20 relative z-10">
        {/* 연도별 선택과 인터뷰 고객 수를 묶어서 표시 */}
        <Card className="mb-5 shadow-sm border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">연간 인터뷰 현황</CardTitle>
            <CardDescription>
              원하는 연도를 선택하여 데이터를 확인하세요 (복수 선택 가능)
            </CardDescription>
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
                  {years.map((year) => (
                    <DropdownMenuCheckboxItem
                      key={year}
                      checked={selectedYears.includes(year)}
                      onCheckedChange={() => toggleYear(year)}
                      disabled={selectedYears.length === 1 && selectedYears.includes(year)}
                    >
                      {year}년 ({insightData[year].intervieweeCount}명)
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* 선택된 연도 태그 */}
              <div className="flex gap-2 flex-wrap">
                {selectedYears.map(year => (
                  <Badge key={year} variant="outline" className="px-3 py-1 text-sm bg-primary/5 border-gray-200 dark:border-gray-800">
                    {year}년: <span className="font-bold ml-1">{insightData[year].intervieweeCount}명</span>
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
                      {selectedYears.reduce((total, year) => total + insightData[year].intervieweeCount, 0)}
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
                        return total + insightData[year].insights.length
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
        {currentYearData.insights.length > 0 ? (
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
                    {currentYearData.insights.map((insight, idx) => (
                      <div 
                        key={idx} 
                        className={`relative border border-gray-200 dark:border-gray-800 rounded-lg transition-all ${
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
                        <div className="p-5 cursor-pointer">
                          <div className="font-medium text-base mb-2">{insight.title}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2 mb-4">{insight.summary}</div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <Badge variant="outline" className="bg-primary/5 border-primary/10">
                              언급 {insight.mentionCount}회
                            </Badge>
                            <Badge variant="outline" className="bg-primary/5 border-primary/10">
                              고객 {insight.quotes.length}명
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
                      {currentYearData.insights.map((insight, idx) => (
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
            
            {/* 선택된 인사이트 상세 보기와 고객 이야기를 하나의 카드로 묶기 */}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                  {/* 인사이트 상세 요약 */}
                  <div>
                    <Card className={`shadow-sm border-gray-200 dark:border-gray-800 ${showDetailAnalysis ? 'h-full' : ''}`}>
                      <CardHeader className="cursor-pointer flex flex-row items-center justify-between" onClick={() => setShowDetailAnalysis(!showDetailAnalysis)}>
                        <CardTitle className="text-lg font-medium">상세 분석</CardTitle>
                        <ChevronDown className={`h-4 w-4 transition-transform ${showDetailAnalysis ? '' : 'transform rotate-180'}`} />
                      </CardHeader>
                      {showDetailAnalysis && (
                        <CardContent className="flex flex-col justify-between h-full">
                          <div className="space-y-4">
                            <p className="text-sm leading-relaxed">
                              최근 고객 인터뷰에서 공통적으로 강조된 "{currentYearData.insights[currentInsight].title}"에 대한 분석입니다. 
                              사용자들은 복잡한 인터페이스보다 직관적이고 단순한 디자인을 선호하는 경향이 뚜렷하게 나타났습니다.
                            </p>
                            <p className="text-sm leading-relaxed">
                              특히 사용자의 73%가 첫 사용 시 학습 곡선이 낮은 직관적 UI를 중요시했으며, 68%는 전반적인 사용성을 
                              가장 중요한 요소로 꼽았습니다. 간결함(52%)과 쉬운 접근성(49%)도 주요 요구사항으로 확인되었습니다.
                            </p>
                            <p className="text-sm leading-relaxed">
                              다양한 연령대와 직업군에서 공통적으로 발견되는 이 인사이트는 사용자 인터페이스 개선 시 
                              우선적으로 고려해야 할 요소로 판단됩니다. 특히 첫 사용자 경험(First-time User Experience)에서
                              직관적인 디자인의 중요성이 강조되었습니다.
                            </p>
                            <div>
                              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none">사용자 경험</Badge>
                              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none ml-2">UI 디자인</Badge>
                              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none ml-2">사용성</Badge>
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  </div>
                  
                  {/* 키워드 원형 그래프 */}
                  <div>
                    <Card className={`shadow-sm border-gray-200 dark:border-gray-800 ${showRelatedKeywords ? 'h-full' : ''}`}>
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
                                  data={currentYearData.insights[currentInsight].keywords}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  outerRadius={90}
                                  fill="#8884d8"
                                  dataKey="weight"
                                  nameKey="name"
                                  label={({ name }) => name}
                                >
                                  {currentYearData.insights[currentInsight].keywords.map((_, index) => (
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
                                <Link href="/">
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
          </>
        ) : (
          <Card className="py-16 shadow-sm border-gray-200 dark:border-gray-800">
            <div className="text-center text-muted-foreground">
              <p className="mb-4">선택한 연도에 대한 인터뷰가 없습니다.</p>
              <Button variant="outline" className="border-gray-200 dark:border-gray-800" onClick={() => setSelectedYears(["2023"])}>
                2023년
              </Button>
            </div>
          </Card>
        )}
      </main>
      
      <footer className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
        <p>© 2025 Persona Insight by MISO1004. All rights reserved.</p>
      </footer>
    </div>
  )
} 