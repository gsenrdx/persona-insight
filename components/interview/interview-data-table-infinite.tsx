"use client"

import * as React from "react"
import { Interview } from "@/types/interview"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  getFacetedRowModel,
  getFacetedUniqueValues,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { createInterviewColumns } from "./interview-columns"
import { FileText, Search, Loader2, Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useInView } from "react-intersection-observer"
import { usePersonas } from "@/hooks/use-personas"
import { useAuth } from "@/hooks/use-auth"
import { EditInterviewMetadataModal } from "@/components/modal/edit-interview-metadata-modal"

interface InterviewDataTableInfiniteProps {
  interviews: Interview[]
  onView: (id: string) => void
  onDelete?: (id: string) => void
  isLoading?: boolean
  currentUserId?: string
  presence?: Record<string, any[]>
  onRetry?: (id: string) => void
  isAdmin?: boolean
  onAssignPersona?: (interviewId: string, recommendedPersona?: string) => void
  onBatchAssignPersona?: (interviewIds: string[]) => void
  isBatchAssigning?: boolean
  projectId?: string
}

const ITEMS_PER_PAGE = 20

export function InterviewDataTableInfinite({
  interviews,
  onView,
  onDelete,
  isLoading,
  currentUserId,
  presence,
  onRetry,
  isAdmin,
  onAssignPersona,
  onBatchAssignPersona,
  isBatchAssigning = false,
  projectId,
}: InterviewDataTableInfiniteProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "created_at", desc: true },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [visibleRows, setVisibleRows] = React.useState(ITEMS_PER_PAGE)
  const [showMyInterviewsOnly, setShowMyInterviewsOnly] = React.useState(false)
  const hasActiveFilters = columnFilters.length > 0 || showMyInterviewsOnly || globalFilter
  const [editingInterview, setEditingInterview] = React.useState<Interview | null>(null)
  
  // 페르소나 조합 목록 가져오기
  const { profile } = useAuth()
  const { data: personaCombinations = [] } = usePersonas({
    companyId: profile?.company_id
  })
  
  // 생성자 목록 추출
  const creators = React.useMemo(() => {
    const creatorMap = new Map<string, { id: string; name: string }>()
    
    if (!interviews) return []
    
    interviews.forEach(interview => {
      if (interview.created_by && interview.created_by_profile?.name) {
        creatorMap.set(interview.created_by, {
          id: interview.created_by,
          name: interview.created_by_profile.name
        })
      }
    })
    
    return Array.from(creatorMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [interviews])

  // Intersection observer for infinite scroll
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  })

  // Load more items when scrolling to bottom
  React.useEffect(() => {
    if (inView && !isLoading) {
      const timeoutId = setTimeout(() => {
        setVisibleRows(prev => {
          const dataLength = interviews.length
          const newValue = prev + ITEMS_PER_PAGE
          return newValue >= dataLength ? dataLength : newValue
        })
      }, 100) // Small delay to prevent rapid updates
      
      return () => clearTimeout(timeoutId)
    }
  }, [inView, isLoading, interviews.length])

  // Track previous interview count to detect additions/removals
  const prevLengthRef = React.useRef(interviews.length)
  
  // Reset visible rows only when interviews are cleared or initially loaded
  React.useEffect(() => {
    const prevLength = prevLengthRef.current
    const currentLength = interviews.length
    
    // Only reset if going from 0 to some, or from some to 0
    if ((prevLength === 0 && currentLength > 0) || (prevLength > 0 && currentLength === 0)) {
      setVisibleRows(ITEMS_PER_PAGE)
    }
    
    prevLengthRef.current = currentLength
  }, [interviews.length])

  const columns = React.useMemo(
    () => createInterviewColumns(
      onView, 
      onDelete, 
      currentUserId, 
      onRetry, 
      isAdmin,
      onAssignPersona ? (interviewId: string) => {
        const interview = interviews.find(i => i.id === interviewId)
        const recommendedPersona = interview?.ai_persona_definition?.name_ko || interview?.ai_persona_match
        onAssignPersona(interviewId, recommendedPersona)
      } : undefined,
      projectId,
      personaCombinations,
      creators,
      (interview: Interview) => setEditingInterview(interview)
    ),
    [onView, onDelete, currentUserId, onRetry, isAdmin, onAssignPersona, projectId, interviews, personaCombinations, creators]
  )

  // Memoize filtered and sorted data
  const processedData = React.useMemo(() => {
    let data = [...interviews]
    
    // Apply "my interviews only" filter
    if (showMyInterviewsOnly && currentUserId) {
      data = data.filter(interview => interview.created_by === currentUserId)
    }
    
    // Apply global filter
    if (globalFilter) {
      data = data.filter(interview => {
        const searchableText = [
          interview.title,
          interview.created_by_profile?.name,
          interview.interviewee_profile?.[0]?.demographics?.age_group,
          interview.interviewee_profile?.[0]?.demographics?.gender,
        ].filter(Boolean).join(' ').toLowerCase()
        
        return searchableText.includes(globalFilter.toLowerCase())
      })
    }
    
    // Apply sorting
    if (sorting.length > 0) {
      const sort = sorting[0]
      data.sort((a, b) => {
        const aVal = sort.id === 'created_at' ? new Date(a.created_at).getTime() : a[sort.id as keyof Interview]
        const bVal = sort.id === 'created_at' ? new Date(b.created_at).getTime() : b[sort.id as keyof Interview]
        
        if (aVal < bVal) return sort.desc ? 1 : -1
        if (aVal > bVal) return sort.desc ? -1 : 1
        return 0
      })
    }
    
    return data
  }, [interviews, globalFilter, sorting, showMyInterviewsOnly, currentUserId])
  
  const table = useReactTable({
    data: processedData.slice(0, visibleRows),
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: true, // Disable automatic pagination
    pageCount: -1, // Unknown page count for infinite scroll
    enableRowSelection: true,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  })

  // 로딩 상태
  if (isLoading && interviews.length === 0) {
    return (
      <div className="h-full flex flex-col relative bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30 rounded-2xl overflow-hidden shadow-xl border border-white/20">
        {/* 장식용 배경 요소 */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-200/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-200/10 rounded-full blur-2xl" />
        
        {/* 검색 바 스켈레톤 */}
        <div className="relative z-10 flex-shrink-0 px-6 lg:px-8 py-5 bg-white/60 backdrop-blur-sm border-b border-gray-200/50">
          <div className="flex items-center justify-between gap-4">
            <div className="relative max-w-md flex-1">
              <div className="h-10 w-full animate-pulse bg-white/80 rounded-xl shadow-sm" />
            </div>
          </div>
        </div>

        {/* 테이블 스켈레톤 */}
        <div className="relative z-10 flex-1 overflow-y-auto bg-white/40 backdrop-blur-sm px-6 lg:px-8">
          <table className="w-full">
            <thead className="sticky top-0 z-20 bg-white/80 backdrop-blur-md">
              <tr className="border-b border-gray-200/60">
                {/* 체크박스 컬럼 */}
                <th className="text-left text-sm font-medium text-gray-700 whitespace-nowrap py-3 w-[40px] pl-0">
                  <div className="h-4 w-4 animate-pulse bg-gray-100 rounded" />
                </th>
                {/* 처리 상태 컬럼 */}
                <th className="text-left text-sm font-medium text-gray-700 whitespace-nowrap py-3 px-2 w-[100px]">
                  <div className="h-4 w-16 animate-pulse bg-gray-100 rounded" />
                </th>
                {/* 제목 컬럼 */}
                <th className="text-left text-sm font-medium text-gray-700 whitespace-nowrap py-3 px-2 w-[180px] max-w-[180px]">
                  <div className="flex items-center gap-1">
                    <div className="h-4 w-8 animate-pulse bg-gray-100 rounded" />
                    <div className="h-3 w-3 animate-pulse bg-gray-100 rounded" />
                  </div>
                </th>
                {/* 페르소나 분류 컬럼 */}
                <th className="text-left text-sm font-medium text-gray-700 whitespace-nowrap py-3 px-2 w-[200px] hidden md:table-cell">
                  <div className="h-4 w-20 animate-pulse bg-gray-100 rounded" />
                </th>
                {/* 생성일시 컬럼 */}
                <th className="text-left text-sm font-medium text-gray-700 whitespace-nowrap py-3 px-2 w-[120px]">
                  <div className="flex items-center gap-1">
                    <div className="h-4 w-12 animate-pulse bg-gray-100 rounded" />
                    <div className="h-3 w-3 animate-pulse bg-gray-100 rounded" />
                  </div>
                </th>
                {/* 생성자 컬럼 */}
                <th className="text-left text-sm font-medium text-gray-700 whitespace-nowrap py-3 px-2 w-[110px] hidden lg:table-cell">
                  <div className="h-4 w-12 animate-pulse bg-gray-100 rounded" />
                </th>
                {/* 액션 컬럼 */}
                <th className="text-left text-sm font-medium text-gray-700 whitespace-nowrap py-3 pr-0 w-[40px]">
                  <div className="h-4 w-4 animate-pulse bg-gray-100 rounded" />
                </th>
              </tr>
            </thead>
            <tbody className="bg-transparent">
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {/* 체크박스 */}
                  <td className="py-3 pl-0">
                    <div className="flex justify-center">
                      <div className="h-4 w-4 animate-pulse bg-gray-100 rounded" />
                    </div>
                  </td>
                  {/* 처리 상태 */}
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border h-6 w-14 animate-pulse",
                        i % 4 === 0 ? "bg-green-50 border-green-100" : 
                        i % 4 === 1 ? "bg-blue-50 border-blue-100" :
                        i % 4 === 2 ? "bg-gray-50 border-gray-100" : "bg-red-50 border-red-100"
                      )} />
                    </div>
                  </td>
                  {/* 제목 */}
                  <td className="py-3 px-2">
                    <div className="min-w-0">
                      <div className="h-5 w-32 animate-pulse bg-gray-100 rounded" />
                    </div>
                  </td>
                  {/* 페르소나 분류 */}
                  <td className="py-3 px-2 hidden md:table-cell">
                    <div className="min-w-0 flex items-center gap-2">
                      {i % 3 === 0 ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium h-6 w-20 animate-pulse bg-yellow-200/60" />
                      ) : (
                        <>
                          <div className="h-3 w-12 animate-pulse bg-gray-100 rounded" />
                          <div className="h-6 w-16 animate-pulse bg-gray-100 border border-gray-200 rounded" />
                        </>
                      )}
                    </div>
                  </td>
                  {/* 생성일시 */}
                  <td className="py-3 px-2">
                    <div className="h-4 w-20 animate-pulse bg-gray-100 rounded" />
                  </td>
                  {/* 생성자 */}
                  <td className="py-3 px-2 hidden lg:table-cell">
                    <div className="h-4 w-16 animate-pulse bg-gray-100 rounded truncate max-w-[100px]" />
                  </td>
                  {/* 액션 */}
                  <td className="py-3 pr-0">
                    <div className="h-8 w-8 animate-pulse bg-gray-100 rounded" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // 빈 상태
  if (!isLoading && interviews.length === 0) {
    return (
      <div className="h-full flex flex-col relative bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30 rounded-2xl overflow-hidden shadow-xl border border-white/20">
        {/* 장식용 배경 요소 */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-200/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-200/10 rounded-full blur-2xl" />
        
        {/* 검색 바 - 빈 상태에서도 표시 */}
        <div className="relative z-10 flex-shrink-0 px-6 py-5 bg-white/60 backdrop-blur-sm border-b border-gray-200/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              placeholder="검색..."
              value={globalFilter ?? ""}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="block w-full pl-9 pr-3 py-2.5 text-sm bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all opacity-50 cursor-not-allowed"
              disabled
            />
          </div>
        </div>
        
        <div className="relative z-10 flex-1 flex items-center justify-center bg-white/20 backdrop-blur-sm">
          <div className="text-center py-12">
            <div className="mx-auto h-20 w-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <FileText className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">아직 인터뷰가 없어요</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              첫 번째 인터뷰를 추가해서 고객의 소리를 들어보세요
            </p>
          </div>
        </div>
      </div>
    )
  }

  const displayedData = processedData.slice(0, visibleRows)
  const filteredRows = table.getRowModel().rows
  const selectedRows = table.getSelectedRowModel().rows
  
  // 실제 반영 가능한 선택된 항목 개수 계산
  const assignableSelectedCount = selectedRows.filter(row => 
    !row.original.confirmed_persona_definition_id && row.original.ai_persona_match
  ).length

  return (
    <div className="h-full flex flex-col relative bg-gradient-to-br from-blue-50/50 via-slate-50 to-blue-100/40 rounded-2xl overflow-hidden shadow-xl border border-white/20">
      {/* 장식용 배경 요소 - 브랜드 일관성 */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-200/15 rounded-full blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-300/15 rounded-full blur-2xl" />
      
      {/* 테이블 헤더 - 고정 */}
      <div className="relative z-10 flex-shrink-0 px-6 lg:px-8 py-5 bg-white/60 backdrop-blur-sm border-b border-gray-200/50">
        <div className="flex items-center justify-between">
          {/* 왼쪽: 검색 바 및 AI 버튼 */}
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-600 pointer-events-none" />
              <input
                type="text"
                placeholder="검색..."
                value={globalFilter ?? ""}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-gray-300 rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:shadow-md"
              />
            </div>
            
            {/* AI 추천 반영 버튼 */}
            {selectedRows.length > 0 && assignableSelectedCount > 0 && onBatchAssignPersona && (
              <button
                onClick={async () => {
                  const selectedIds = selectedRows
                    .filter(row => !row.original.confirmed_persona_definition_id && row.original.ai_persona_match)
                    .map(row => row.original.id)
                  
                  if (selectedIds.length === 0) return
                  
                  const result = await onBatchAssignPersona(selectedIds)
                  if (result && result.results && result.results.successCount > 0) {
                    table.toggleAllPageRowsSelected(false)
                  }
                }}
                disabled={isBatchAssigning}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {isBatchAssigning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>
                  {isBatchAssigning ? '반영 중...' : 'AI 추천 반영'}
                </span>
                <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-bold bg-white/20 rounded-full">
                  {assignableSelectedCount}
                </span>
              </button>
            )}
          </div>
          
          {/* 오른쪽: 필터 컨트롤 */}
          <div className="flex items-center gap-4">
            {/* 필터 초기화 */}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setColumnFilters([])
                  setShowMyInterviewsOnly(false)
                  setGlobalFilter("")
                }}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium px-3 py-1.5 rounded-lg hover:bg-white/60"
              >
                필터 초기화
              </button>
            )}
            
            {/* 내 인터뷰만 보기 */}
            {currentUserId && (
              <div className="flex items-center gap-3">
                <label 
                  htmlFor="my-interviews-only" 
                  className="text-sm text-gray-700 cursor-pointer select-none whitespace-nowrap font-medium"
                >
                  내 인터뷰만
                </label>
                <Switch
                  id="my-interviews-only"
                  checked={showMyInterviewsOnly}
                  onCheckedChange={setShowMyInterviewsOnly}
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-600 data-[state=checked]:to-indigo-600"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 테이블 - 스크롤 영역 */}
      <div className="relative z-10 flex-1 overflow-y-auto bg-white/40 backdrop-blur-sm px-6 lg:px-8">
        <table className="w-full">
          <thead className="sticky top-0 z-20 bg-white/80 backdrop-blur-md">
            <tr className="border-b border-gray-200/60">
              {table.getHeaderGroups()[0].headers.map((header) => {
                return (
                  <th key={header.id} className={cn(
                    "text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap py-4 bg-gradient-to-r from-gray-50/50 to-blue-50/30 backdrop-blur-sm",
                    header.id === "select" ? "w-[40px] pl-0" : "",
                    header.id === "status" ? "px-3 w-[100px]" : "",
                    header.id === "title" ? "px-3 w-[180px] max-w-[180px]" : "",
                    header.id === "persona" ? "px-3 w-[200px] hidden md:table-cell" : "",
                    header.id === "created_at" ? "px-3 w-[120px]" : "",
                    header.id === "created_by" ? "px-3 w-[110px] hidden lg:table-cell" : "",
                    header.id === "actions" ? "pr-0 w-[40px]" : "",
                    !["status", "title", "persona", "quality", "created_at", "created_by", "actions"].includes(header.id) ? "px-4" : ""
                  )}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="bg-transparent">
            {filteredRows.length ? (
              <>
                {filteredRows.map((row, index) => (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="cursor-pointer hover:bg-white/60 hover:shadow-md transition-all duration-200 border-b border-gray-200/40 hover:border-blue-200/60 group"
                    onClick={(e) => {
                      const target = e.target as HTMLElement
                      // 체크박스, 버튼, 메뉴 아이템을 클릭한 경우에는 상세보기로 이동하지 않음
                      if (!target.closest('[role="menuitem"]') && 
                          !target.closest('button') && 
                          !target.closest('input[type="checkbox"]') &&
                          !target.closest('td:first-child')) { // 체크박스가 있는 첫 번째 td 전체 영역 제외
                        onView(row.original.id)
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className={cn(
                        "py-4 text-sm text-gray-700 group-hover:text-gray-900 transition-colors",
                        cell.column.id === "select" ? "pl-0" : "",
                        cell.column.id === "status" ? "px-3" : "",
                        cell.column.id === "persona" ? "px-3 hidden md:table-cell" : "",
                        cell.column.id === "created_by" ? "px-3 hidden lg:table-cell" : "",
                        cell.column.id === "actions" ? "pr-0" : "",
                        !["select", "status", "actions", "persona", "created_by"].includes(cell.column.id) ? "px-3" : ""
                      )}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* 더 많은 데이터가 있으면 로딩 인디케이터 표시 */}
                {visibleRows < processedData.length && !isLoading && (
                  <tr ref={ref}>
                    <td colSpan={columns.length} className="text-center py-6">
                      <div className="flex items-center justify-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl mx-4 py-3 shadow-sm">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                        <span className="text-sm text-gray-600 font-medium">더 불러오는 중...</span>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-32 text-center"
                >
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <Search className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 font-medium">검색 결과가 없어요</p>
                    <p className="text-xs text-gray-500 mt-1">다른 검색어를 시도해보세요</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* 메타데이터 수정 모달 */}
      {editingInterview && (
        <EditInterviewMetadataModal
          open={!!editingInterview}
          onOpenChange={(open) => !open && setEditingInterview(null)}
          interview={editingInterview}
          onUpdate={(updatedData) => {
            // 인터뷰 목록 새로고침을 위해 상위 컴포넌트에서 처리해야 함
            setEditingInterview(null)
            // TODO: 목록 새로고침 로직은 상위 컴포넌트에서 처리
          }}
        />
      )}
    </div>
  )
}