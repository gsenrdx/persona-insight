"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ModeToggle } from "@/components/shared"
import { CalendarDays, Search, Filter, Users, MessageSquare, ArrowRight, MessageCircle } from "lucide-react"
import { IntervieweeData, IntervieweeApiResponse } from "@/types/interviewee"
import { useAuth } from "@/hooks/use-auth"

// Framer Motion variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  }
}

const cardHoverVariants = {
  rest: { scale: 1, y: 0 },
  hover: { 
    scale: 1.02, 
    y: -4,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  }
}

export default function InterviewsPage() {
  const { profile } = useAuth()
  const [interviews, setInterviews] = useState<IntervieweeData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("date")
  const [filterBy, setFilterBy] = useState("all")
  const router = useRouter()

  useEffect(() => {
    if (profile?.company_id && profile?.current_project_id) {
      fetchInterviews()
    }
  }, [profile?.company_id, profile?.current_project_id])

  const fetchInterviews = async () => {
    try {
      setLoading(true)
      
      if (!profile?.company_id || !profile?.current_project_id) {
        setError('회사 또는 프로젝트 정보를 찾을 수 없습니다')
        return
      }

      console.log('인터뷰 데이터 로드 중 - 프로젝트:', profile?.current_project?.name, 'ID:', profile?.current_project_id);

      const response = await fetch(`/api/supabase/interviewee?company_id=${profile.company_id}&project_id=${profile.current_project_id}`)
      
      if (!response.ok) {
        throw new Error('데이터를 가져오는데 실패했습니다')
      }
      
      const result: IntervieweeApiResponse = await response.json()
      setInterviews(result.data || [])
      
      console.log('인터뷰 데이터 로드 완료:', result.data?.length || 0, '개');
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 검색 및 필터링된 데이터
  const filteredAndSortedInterviews = useMemo(() => {
    let filtered = interviews.filter(interview => {
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = 
        interview.user_description?.toLowerCase().includes(searchLower) ||
        interview.interviewee_summary?.toLowerCase().includes(searchLower) ||
        interview.user_type?.toLowerCase().includes(searchLower)
      
      if (!matchesSearch) return false
      
      if (filterBy === "all") return true
      return interview.user_type?.trim() === filterBy
    })

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
        case "type":
          return a.user_type.localeCompare(b.user_type)
        case "score":
          const aScore = a.charging_pattern_scores?.[0]?.home_centric_score || 0
          const bScore = b.charging_pattern_scores?.[0]?.home_centric_score || 0
          return bScore - aScore
        default:
          return 0
      }
    })

    return filtered
  }, [interviews, searchQuery, sortBy, filterBy])

  // 사용자 타입별 통계
  const userTypeStats = useMemo(() => {
    const stats = interviews.reduce((acc, interview) => {
      const userType = interview.user_type?.trim()
      if (userType && userType !== '') {
        acc[userType] = (acc[userType] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)
    return stats
  }, [interviews])

  const handleInterviewClick = (index: number) => {
    router.push(`/interviews/${index}`)
  }

  if (loading) {
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
                <span className="ml-2 text-xs text-muted-foreground">by MISO</span>
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
          <div className="space-y-6">
            <Card className="shadow-sm border-gray-200 dark:border-gray-800">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="shadow-sm border-gray-200 dark:border-gray-800">
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-3" />
                    <Skeleton className="h-16 w-full mb-3" />
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
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
                <span className="ml-2 text-xs text-muted-foreground">by MISO</span>
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
          <Alert variant="destructive" className="shadow-sm">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </main>
      </div>
    )
  }

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
              <span className="ml-2 text-xs text-muted-foreground">by MISO</span>
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
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* 인터뷰 현황 카드 */}
          <motion.div variants={itemVariants}>
            <Card className="shadow-sm border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">인터뷰 데이터</CardTitle>
                <div className="text-sm text-muted-foreground">
                  총 {interviews.length}개의 인터뷰 결과를 확인할 수 있습니다
                </div>
              </CardHeader>
              <CardContent>
                {/* 통계 요약 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{interviews.length}</div>
                    <div className="text-xs text-muted-foreground">총 인터뷰</div>
                  </div>
                  
                  {Object.entries(userTypeStats)
                    .filter(([type]) => type && type.trim() !== '')
                    .slice(0, 3)
                    .map(([type, count]) => (
                      <div key={type} className="text-center">
                        <div className="text-2xl font-bold text-primary">{count}</div>
                        <div className="text-xs text-muted-foreground">타입 {type}</div>
                      </div>
                    ))}
                </div>

                {/* 검색 및 필터 */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="인터뷰 내용, 요약, 사용자 타입으로 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 border-gray-200 dark:border-gray-800"
                    />
                  </div>
                  
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-[140px] border-gray-200 dark:border-gray-800">
                      <SelectValue placeholder="정렬" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">날짜순</SelectItem>
                      <SelectItem value="type">타입순</SelectItem>
                      <SelectItem value="score">점수순</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterBy} onValueChange={setFilterBy}>
                    <SelectTrigger className="w-full sm:w-[140px] border-gray-200 dark:border-gray-800">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="필터" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      {Object.keys(userTypeStats)
                        .filter(type => type && type.trim() !== '')
                        .map(type => (
                          <SelectItem key={type} value={type}>타입 {type}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 인터뷰 카드 그리드 */}
          <AnimatePresence mode="wait">
            {filteredAndSortedInterviews.length > 0 ? (
              <motion.div
                key="interviews"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {filteredAndSortedInterviews.map((interview, index) => (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    whileHover="hover"
                    whileTap={{ scale: 0.98 }}
                    initial="rest"
                    animate="rest"
                  >
                    <motion.div
                      variants={cardHoverVariants}
                      className="h-full"
                    >
                      <Card 
                        className="cursor-pointer shadow-sm border-gray-200 dark:border-gray-800 h-full transition-colors hover:border-primary/50"
                        onClick={() => handleInterviewClick(index)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-primary/5 border-primary/20">
                                {interview.user_type}
                              </Badge>
                              {interview.interviewee_fake_name && (
                                <Badge variant="secondary" className="text-xs">
                                  {interview.interviewee_fake_name}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <CalendarDays className="h-3 w-3 mr-1" />
                              {interview.session_date}
                            </div>
                          </div>
                          <CardTitle className="text-sm line-clamp-2 leading-relaxed">
                            {interview.user_description}
                          </CardTitle>
                        </CardHeader>
                        
                        <CardContent className="space-y-3">
                          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                            {interview.interviewee_summary}
                          </p>

                          {/* 하단 정보 */}
                          <div className="flex items-center justify-between pt-1">
                            {interview.interview_detail && (
                              <div className="flex items-center text-xs text-muted-foreground">
                                <MessageSquare className="h-3 w-3 mr-1" />
                                <span>{interview.interview_detail.length}개 주제</span>
                              </div>
                            )}

                            <div className="flex items-center text-xs text-primary">
                              <span className="mr-1">자세히</span>
                              <ArrowRight className="h-3 w-3" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="text-center py-12"
              >
                <Card className="shadow-sm border-gray-200 dark:border-gray-800 max-w-md mx-auto">
                  <CardContent className="p-8">
                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <Search className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">검색 결과가 없습니다</h3>
                    <p className="text-sm text-muted-foreground">
                      다른 검색어를 시도하거나 필터를 변경해보세요
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  )
} 