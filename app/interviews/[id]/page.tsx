"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { ModeToggle } from "@/components/shared"
import { 
  ArrowLeft, 
  CalendarDays, 
  User, 
  BarChart3, 
  MessageSquare, 
  Lightbulb,
  AlertTriangle,
  Target,
  Quote,
  Hash,
  MessageCircle,
  Battery,
  Car,
  Home
} from "lucide-react"
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

// 점수 슬라이더 컴포넌트
function ScoreSlider({ label, value, color = "blue" }: { label: string, value: number, color?: string }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500",
    green: "bg-green-500", 
    orange: "bg-orange-500",
    purple: "bg-purple-500"
  }

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[80px]">{label}</span>
      <div className="flex-1 mx-4">
        <div className="relative">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${colorClasses[color] || colorClasses.blue} transition-all duration-500`}
              style={{ width: `${value}%` }}
            />
          </div>
          <div 
            className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full shadow-sm"
            style={{ left: `calc(${value}% - 6px)` }}
          />
        </div>
      </div>
      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 min-w-[30px] text-right">{value}</span>
    </div>
  )
}

// 기능 활용도 아이템 컴포넌트
function FeatureItem({ icon: Icon, title, description, score }: { 
  icon: any, 
  title: string, 
  description: string,
  score?: number 
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
          {score && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div 
                  className="h-1.5 bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{score}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function InterviewDetailPage() {
  const { profile } = useAuth()
  const params = useParams()
  const router = useRouter()
  const [interview, setInterview] = useState<IntervieweeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  useEffect(() => {
    if (profile?.company_id) {
      fetchInterviewDetail()
    }
  }, [params.id, profile?.company_id])

  const fetchInterviewDetail = async () => {
    try {
      setLoading(true)
      setImageError(false)
      setImageLoading(true)
      
      if (!profile?.company_id) {
        setError('회사 정보를 찾을 수 없습니다')
        return
      }

      const response = await fetch(`/api/supabase/interviewee?company_id=${profile.company_id}`)
      
      if (!response.ok) {
        throw new Error('데이터를 가져오는데 실패했습니다')
      }
      
      const result: IntervieweeApiResponse = await response.json()
      const interviews = result.data || []
      const index = parseInt(params.id as string)
      
      if (index >= 0 && index < interviews.length) {
        setInterview(interviews[index])
      } else {
        throw new Error('해당 인터뷰를 찾을 수 없습니다')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-64" />
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !interview) {
    return (
      <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              돌아가기
            </Button>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertDescription>{error || '인터뷰 데이터를 찾을 수 없습니다'}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  const getUserTypeInfo = (userType: string) => {
    const types: Record<string, { title: string, subtitle: string, color: string, description: string }> = {
      'A': { 
        title: 'Type A', 
        subtitle: 'Home-centric / Cost-driven',
        color: 'blue',
        description: '출퇴근, 생활권 중심으로 가성비를 최우선하는 실속파'
      },
      'B': { 
        title: 'Type B', 
        subtitle: 'Home-centric / Tech/Brand-driven',
        color: 'green',
        description: '스마트홈·브랜드 경험을 중시하는 도시형 얼리어답터'
      },
      'C': { 
        title: 'Type C', 
        subtitle: 'Road-centric / Cost-driven',
        color: 'purple',
        description: '장거리 이동이 잦고 충전 비용 절감에 민감한 여행족'
      },
      'D': { 
        title: 'Type D', 
        subtitle: 'Road-centric / Tech/Brand-driven',
        color: 'orange',
        description: '초고속 충전과 고급 서비스를 추구하는 프리미엄 장거리 이용자'
      }
    }
    return types[userType] || {
      title: '기타 유형',
      subtitle: 'Unknown Type',
      color: 'gray',
      description: '세부 유형에 대한 설명이 지정되지 않았습니다.'
    }
  }

  const typeInfo = getUserTypeInfo(interview.user_type)

  // 실제 데이터에서 키워드 추출
  const allKeywords = interview.interview_detail?.flatMap(detail => 
    detail.keyword_cluster || []
  ).slice(0, 8) || []

  // 실제 데이터에서 페인포인트와 니즈 개수 계산
  const totalPainPoints = interview.interview_detail?.reduce((acc, detail) => 
    acc + (detail.painpoint?.length || 0), 0) || 0
  const totalNeeds = interview.interview_detail?.reduce((acc, detail) => 
    acc + (detail.need?.length || 0), 0) || 0

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                돌아가기
              </Button>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/interviews">인터뷰 목록</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{typeInfo.title} 상세</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" asChild>
                <Link href="/">홈으로</Link>
              </Button>
              <ModeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* 프로필 헤더 + 써머리 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-start gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-900 rounded-full flex items-center justify-center overflow-hidden relative">
                {interview.thumbnail && !imageError ? (
                  <>
                    {/* 이미지 로딩 중 Skeleton */}
                    {imageLoading && (
                      <div className="absolute inset-0 bg-gray-200 dark:bg-gray-600 animate-pulse rounded-full" />
                    )}
                    
                    {/* 실제 이미지 */}
                    <img
                      src={interview.thumbnail}
                      alt={`${typeInfo.title} 프로필 이미지`}
                      className={`w-full h-full object-cover rounded-full transition-opacity duration-500 ${
                        imageLoading ? 'opacity-0' : 'opacity-100'
                      }`}
                      crossOrigin="anonymous"
                      onError={() => {
                        setImageError(true)
                        setImageLoading(false)
                      }}
                      onLoad={() => {
                        setImageLoading(false)
                      }}
                    />
                  </>
                ) : (
                  <User className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{typeInfo.title}</h1>
                  <Badge variant="outline" className="text-xs">
                    <CalendarDays className="h-3 w-3 mr-1" />
                    {interview.session_date}
                  </Badge>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{typeInfo.subtitle}</p>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {interview.user_description}
                </h2>
              </div>
            </div>

            {/* 써머리 - 오른쪽에 배치 */}
            <div className="flex-1 ml-8">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">
                  인터뷰 요약
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  {interview.interviewee_summary}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 2단 구조 */}
      <div className="container mx-auto px-4 py-8 pb-16">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-5 gap-6"
          style={{ minHeight: 'calc(100vh - 320px)' }}
        >
          {/* 왼쪽: 통합 정보 (인터뷰 정보 + 충전/서비스 데이터) */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white h-full overflow-y-auto">
              <div className="space-y-6">
                {/* 기본 정보 섹션 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-white">User Research</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2 text-white">사용자 타입</h4>
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                        {interview.user_type} 타입
                      </Badge>
                    </div>

                    {allKeywords.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 text-white">주요 키워드</h4>
                        <div className="flex flex-wrap gap-1">
                          {allKeywords.map((keyword, index) => (
                            <Badge key={index} variant="secondary" className="bg-white/20 text-white border-white/30 text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-medium mb-2 text-white">분석 통계</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-white">분석 주제</span>
                          <span className="font-semibold text-white">{interview.interview_detail?.length || 0}개</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white">페인포인트</span>
                          <span className="font-semibold text-white">{totalPainPoints}개</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white">니즈</span>
                          <span className="font-semibold text-white">{totalNeeds}개</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 충전 패턴 및 서비스 선호도 - 실제 데이터가 있을 때만 표시 */}
                {(interview.charging_pattern_scores?.[0] || interview.value_orientation_scores?.[0] || interview.interviewee_style) && (
                  <>
                    {/* 구분선 */}
                    <div className="border-t border-white/20"></div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-white">충전 인프라 & 서비스 선호도</h3>
                      
                      <div className="space-y-4">
                        {interview.charging_pattern_scores?.[0] && (
                          <div>
                            <h4 className="font-medium mb-3 flex items-center gap-2 text-sm text-white">
                              <Battery className="h-4 w-4" />
                              충전 패턴
                            </h4>
                            <div className="space-y-2">
                              <ScoreSlider 
                                label="완속(AC)" 
                                value={interview.charging_pattern_scores[0].home_centric_score} 
                                color="blue"
                              />
                              <ScoreSlider 
                                label="급속(DC)" 
                                value={interview.charging_pattern_scores[0].road_centric_score} 
                                color="blue"
                              />
                            </div>
                          </div>
                        )}

                        {interview.value_orientation_scores?.[0] && (
                          <div>
                            <h4 className="font-medium mb-2 text-sm text-white">가치 지향성</h4>
                            <p className="text-xs text-white/90 mb-3 leading-relaxed">
                              사용자의 가치 지향성 기반 분석 결과
                            </p>
                            <div className="space-y-2">
                              <ScoreSlider 
                                label="기술/브랜드 중심" 
                                value={interview.value_orientation_scores[0].tech_brand_driven_score} 
                                color="blue"
                              />
                              <ScoreSlider 
                                label="비용 중심" 
                                value={interview.value_orientation_scores[0].cost_driven_score} 
                                color="blue"
                              />
                            </div>
                          </div>
                        )}

                        {interview.interviewee_style && (
                          <div>
                            <h4 className="font-medium mb-2 text-sm text-white">인터뷰 스타일</h4>
                            <div className="bg-white/10 rounded-lg p-3">
                              <p className="text-xs text-white leading-relaxed">
                                {interview.interviewee_style}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-4 border-t border-white/20">
                  <p className="text-xs text-white">Persona Insight Analysis</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 오른쪽: 상세 인터뷰 분석 (넓은 공간 활용) */}
          <motion.div variants={itemVariants} className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 h-full flex flex-col">
              <div className="p-6 flex-shrink-0">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                 Interview Detail
                </h3>
              </div>
              
              <div className="flex-1 px-6 pb-6 overflow-y-auto">
                {interview.interview_detail && interview.interview_detail.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {interview.interview_detail.map((detail, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                        <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-base">
                          {detail.topic_name}
                        </h4>
                        
                        {detail.keyword_cluster && detail.keyword_cluster.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {detail.keyword_cluster.slice(0, 4).map((keyword: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                <Hash className="h-2 w-2 mr-1" />
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Pain Points */}
                        {detail.painpoint && detail.painpoint.length > 0 && (
                          <div className="mb-4">
                            <h5 className="flex items-center gap-2 font-semibold text-red-600 dark:text-red-400 mb-2 text-sm">
                              <AlertTriangle className="h-3 w-3" />
                              Pain Points ({detail.painpoint.length})
                            </h5>
                            <ul className="space-y-1">
                              {detail.painpoint.slice(0, 3).map((point: string, idx: number) => (
                                <li key={idx} className="text-xs text-red-600 dark:text-red-300 leading-relaxed">
                                  • {point}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Needs */}
                        {detail.need && detail.need.length > 0 && (
                          <div className="mb-4">
                            <h5 className="flex items-center gap-2 font-semibold text-blue-600 dark:text-blue-400 mb-2 text-sm">
                              <Lightbulb className="h-3 w-3" />
                              Needs ({detail.need.length})
                            </h5>
                            <ul className="space-y-1">
                              {detail.need.slice(0, 3).map((need: string, idx: number) => (
                                <li key={idx} className="text-xs text-blue-600 dark:text-blue-300 leading-relaxed">
                                  • {need}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Insight Quotes */}
                        {detail.insight_quote && detail.insight_quote.length > 0 && (
                          <div>
                            <h5 className="flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-400 mb-2 text-sm">
                              <Quote className="h-3 w-3" />
                              핵심 인용구 ({detail.insight_quote.length})
                            </h5>
                            <blockquote className="text-xs text-amber-700 dark:text-amber-300 italic border-l-2 border-amber-400 pl-3 leading-relaxed">
                              "{detail.insight_quote[0]}"
                            </blockquote>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">상세 인터뷰 데이터가 없습니다.</p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
} 