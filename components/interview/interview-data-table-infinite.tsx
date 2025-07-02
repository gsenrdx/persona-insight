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
import { createInterviewColumns } from "./interview-columns"
import { FileText, Search, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useInView } from "react-intersection-observer"

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
      projectId
    ),
    [onView, onDelete, currentUserId, onRetry, isAdmin, onAssignPersona, projectId, interviews]
  )

  // Memoize filtered and sorted data
  const processedData = React.useMemo(() => {
    let data = [...interviews]
    
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
  }, [interviews, globalFilter, sorting])
  
  const table = useReactTable({
    data: processedData.slice(0, visibleRows),
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
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
      <div className="h-full flex flex-col">
        {/* 검색 바 스켈레톤 */}
        <div className="flex-shrink-0 px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative max-w-md flex-1">
              <div className="h-9 w-full animate-pulse bg-gray-100 rounded-md" />
            </div>
          </div>
        </div>

        {/* 테이블 스켈레톤 */}
        <div className="flex-1 overflow-y-auto bg-white relative px-6 lg:px-8">
          <table className="w-full">
            <thead className="sticky top-0 z-20 bg-white">
              <tr className="border-b border-gray-100">
                {/* 체크박스 컬럼 */}
                <th className="text-left text-xs font-normal text-gray-500 whitespace-nowrap py-3 w-[40px] pl-0">
                  <div className="h-4 w-4 animate-pulse bg-gray-100 rounded" />
                </th>
                {/* 처리 상태 컬럼 */}
                <th className="text-left text-xs font-normal text-gray-500 whitespace-nowrap py-3 px-2 w-[100px]">
                  <div className="h-4 w-16 animate-pulse bg-gray-100 rounded" />
                </th>
                {/* 제목 컬럼 */}
                <th className="text-left text-xs font-normal text-gray-500 whitespace-nowrap py-3 px-2 w-[180px] max-w-[180px]">
                  <div className="flex items-center gap-1">
                    <div className="h-4 w-8 animate-pulse bg-gray-100 rounded" />
                    <div className="h-3 w-3 animate-pulse bg-gray-100 rounded" />
                  </div>
                </th>
                {/* 페르소나 분류 컬럼 */}
                <th className="text-left text-xs font-normal text-gray-500 whitespace-nowrap py-3 px-2 w-[200px] hidden md:table-cell">
                  <div className="h-4 w-20 animate-pulse bg-gray-100 rounded" />
                </th>
                {/* 생성일시 컬럼 */}
                <th className="text-left text-xs font-normal text-gray-500 whitespace-nowrap py-3 px-2 w-[120px]">
                  <div className="flex items-center gap-1">
                    <div className="h-4 w-12 animate-pulse bg-gray-100 rounded" />
                    <div className="h-3 w-3 animate-pulse bg-gray-100 rounded" />
                  </div>
                </th>
                {/* 생성자 컬럼 */}
                <th className="text-left text-xs font-normal text-gray-500 whitespace-nowrap py-3 px-2 w-[110px] hidden lg:table-cell">
                  <div className="h-4 w-12 animate-pulse bg-gray-100 rounded" />
                </th>
                {/* 액션 컬럼 */}
                <th className="text-left text-xs font-normal text-gray-500 whitespace-nowrap py-3 pr-0 w-[40px]">
                  <div className="h-4 w-4 animate-pulse bg-gray-100 rounded" />
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
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
      <div className="h-full flex flex-col">
        {/* 검색 바 - 빈 상태에서도 표시 */}
        <div className="flex-shrink-0 px-6 py-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="검색..."
              value={globalFilter ?? ""}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 opacity-50 cursor-not-allowed"
              disabled
            />
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="text-center py-12">
            <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">아직 인터뷰가 없습니다</h3>
            <p className="text-sm text-gray-500">
              첫 번째 인터뷰를 추가해보세요
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
    <div className="h-full flex flex-col">
      {/* 검색 바 - 고정 */}
      <div className="flex-shrink-0 px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="검색..."
              value={globalFilter ?? ""}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* 선택된 항목이 있을 때 일괄 작업 버튼 표시 */}
          {selectedRows.length > 0 && assignableSelectedCount > 0 && onBatchAssignPersona && (
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                onClick={async () => {
                  // 이미 반영된 항목을 제외한 선택된 ID만 추출
                  const selectedIds = selectedRows
                    .filter(row => !row.original.confirmed_persona_definition_id && row.original.ai_persona_match)
                    .map(row => row.original.id)
                  
                  if (selectedIds.length === 0) {
                    // 반영 가능한 항목이 없는 경우
                    return
                  }
                  
                  const result = await onBatchAssignPersona(selectedIds)
                  // 성공적으로 반영된 경우 체크박스 해제
                  if (result && result.results && result.results.successCount > 0) {
                    table.toggleAllPageRowsSelected(false)
                  }
                }}
                disabled={isBatchAssigning}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed text-white px-4 py-2 relative overflow-hidden group"
              >
                <div className="flex items-center gap-2">
                  {isBatchAssigning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  <span className="font-medium">
                    {isBatchAssigning ? '반영 중...' : 'AI 추천 반영'}
                  </span>
                  <span className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                    {assignableSelectedCount}
                  </span>
                </div>
              </Button>
              <button
                onClick={() => table.toggleAllPageRowsSelected(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1"
              >
                선택 해제
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 테이블 - 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto bg-white relative px-6 lg:px-8">
        <table className="w-full">
          <thead className="sticky top-0 z-20 bg-white">
            <tr className="border-b border-gray-100">
              {table.getHeaderGroups()[0].headers.map((header) => {
                return (
                  <th key={header.id} className={cn(
                    "text-left text-xs font-normal text-gray-500 whitespace-nowrap py-3",
                    header.id === "select" ? "w-[40px] pl-0" : "",
                    header.id === "status" ? "px-2 w-[100px]" : "",
                    header.id === "title" ? "px-2 w-[180px] max-w-[180px]" : "",
                    header.id === "persona" ? "px-2 w-[200px] hidden md:table-cell" : "",
                    header.id === "created_at" ? "px-2 w-[120px]" : "",
                    header.id === "created_by" ? "px-2 w-[110px] hidden lg:table-cell" : "",
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
          <tbody className="bg-white">
            {filteredRows.length ? (
              <>
                {filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100"
                    onClick={(e) => {
                      const target = e.target as HTMLElement
                      if (!target.closest('[role="menuitem"]') && !target.closest('button')) {
                        onView(row.original.id)
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className={cn(
                        "py-3",
                        cell.column.id === "select" ? "pl-0" : "",
                        cell.column.id === "status" ? "px-2" : "",
                        cell.column.id === "persona" ? "px-2 hidden md:table-cell" : "",
                        cell.column.id === "created_by" ? "px-2 hidden lg:table-cell" : "",
                        cell.column.id === "actions" ? "pr-0" : "",
                        !["select", "status", "actions", "persona", "created_by"].includes(cell.column.id) ? "px-2" : ""
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
                    <td colSpan={columns.length} className="text-center py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">더 불러오는 중...</span>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  검색 결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}