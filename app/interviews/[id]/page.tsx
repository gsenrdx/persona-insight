"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
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
  Home,
  Calendar,
  Clock,
  FileText,
  Edit,
  Trash2
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

interface InterviewDetailPageProps {
  params: { id: string }
}

export default function InterviewDetailPage({ params }: InterviewDetailPageProps) {
  const { profile } = useAuth()
  const router = useRouter()
  const [interview, setInterview] = useState<IntervieweeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  // URL에서 project_id 가져오기
  const projectId = useSearchParams()?.get('project_id')

  useEffect(() => {
    if (params.id) {
      fetchInterview()
    }
  }, [params.id])

  const fetchInterview = async () => {
    try {
      setLoading(true)
      setError(null)
      setImageError(false)
      setImageLoading(true)
      
      const response = await fetch(`/api/supabase/interviewee/${params.id}`)
      
      if (!response.ok) {
        throw new Error('인터뷰 데이터를 가져오는데 실패했습니다')
      }
      
      const result = await response.json()
      setInterview(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!interview || !confirm('정말로 이 인터뷰를 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/supabase/interviewee/${interview.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('인터뷰 삭제에 실패했습니다')
      }

      alert('인터뷰가 삭제되었습니다')
      router.back()
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !interview) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">{error || '인터뷰를 찾을 수 없습니다'}</p>
          <Button variant="outline" onClick={() => router.back()}>뒤로가기</Button>
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
    <div className="container mx-auto py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로가기
          </Button>
          <h1 className="text-2xl font-bold">{interview.interviewee_fake_name || '이름 없음'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            수정
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete} className="text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4 mr-2" />
            삭제
          </Button>
        </div>
      </div>

      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">인터뷰 날짜:</span>
              <span className="text-sm">{new Date(interview.session_date).toLocaleDateString('ko-KR')}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">사용자 유형:</span>
              <Badge variant="secondary">{interview.user_type}</Badge>
            </div>
          </div>
          
          {interview.user_description && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">사용자 설명</h4>
              <p className="text-sm text-gray-800">{interview.user_description}</p>
            </div>
          )}

          {interview.interviewee_summary && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">인터뷰 요약</h4>
              <p className="text-sm text-gray-800">{interview.interviewee_summary}</p>
            </div>
          )}

          {interview.interviewee_style && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">인터뷰 스타일</h4>
              <p className="text-sm text-gray-800">{interview.interviewee_style}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 충전 패턴 점수 */}
      {interview.charging_pattern_scores && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">충전 패턴 점수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.isArray(interview.charging_pattern_scores) ? 
                interview.charging_pattern_scores.map((score, index) => (
                  <div key={index} className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">홈 중심 점수:</span>
                      <span className="text-sm font-medium">{score.home_centric_score}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">로드 중심 점수:</span>
                      <span className="text-sm font-medium">{score.road_centric_score}</span>
                    </div>
                  </div>
                )) : (
                <p className="text-sm text-gray-500">데이터가 없습니다</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 가치 지향 점수 */}
      {interview.value_orientation_scores && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">가치 지향 점수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.isArray(interview.value_orientation_scores) ? 
                interview.value_orientation_scores.map((score, index) => (
                  <div key={index} className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">비용 중심 점수:</span>
                      <span className="text-sm font-medium">{score.cost_driven_score}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">기술/브랜드 중심 점수:</span>
                      <span className="text-sm font-medium">{score.tech_brand_driven_score}</span>
                    </div>
                  </div>
                )) : (
                <p className="text-sm text-gray-500">데이터가 없습니다</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 인터뷰 상세 내용 */}
      {interview.interview_detail && Array.isArray(interview.interview_detail) && interview.interview_detail.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">인터뷰 상세 내용</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {interview.interview_detail.map((detail, index) => (
              <div key={index} className="space-y-4">
                <h4 className="font-medium text-gray-900">{detail.topic_name}</h4>
                
                {detail.painpoint && detail.painpoint.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-red-600 mb-2">페인포인트</h5>
                    <ul className="space-y-1">
                      {detail.painpoint.map((pain, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="w-1 h-1 bg-red-400 rounded-full mt-2 flex-shrink-0"></span>
                          {pain}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {detail.need && detail.need.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-blue-600 mb-2">니즈</h5>
                    <ul className="space-y-1">
                      {detail.need.map((need, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="w-1 h-1 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                          {need}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {detail.insight_quote && detail.insight_quote.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-green-600 mb-2">인사이트 인용구</h5>
                    <div className="space-y-2">
                      {detail.insight_quote.map((quote, idx) => (
                        <blockquote key={idx} className="text-sm text-gray-700 italic border-l-2 border-green-200 pl-3">
                          "{quote}"
                        </blockquote>
                      ))}
                    </div>
                  </div>
                )}

                {detail.keyword_cluster && detail.keyword_cluster.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-purple-600 mb-2">키워드 클러스터</h5>
                    <div className="flex flex-wrap gap-1">
                      {detail.keyword_cluster.map((keyword, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {index < interview.interview_detail.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
} 