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
import { createInterviewColumns } from "./interview-columns"
import { FileText, Search, Loader2 } from "lucide-react"
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
    () => createInterviewColumns(onView, onDelete, currentUserId, presence, onRetry, isAdmin),
    [onView, onDelete, currentUserId, presence, onRetry, isAdmin]
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
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  })

  // 로딩 상태
  if (isLoading && interviews.length === 0) {
    return (
      <div className="w-full h-full overflow-auto">
        {/* 검색 바 스켈레톤 */}
        <div className="sticky top-0 bg-white z-10 pb-4">
          <div className="relative flex-1 max-w-sm">
            <div className="h-9 w-full animate-pulse bg-gray-100 rounded-md" />
          </div>
        </div>
        
        {/* 테이블 스켈레톤 */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <div className="flex items-center gap-1">
                  <div className="h-4 w-12 animate-pulse bg-gray-100 rounded" />
                  <div className="h-3 w-3 animate-pulse bg-gray-100 rounded" />
                </div>
              </TableHead>
              <TableHead>
                <div className="h-4 w-12 animate-pulse bg-gray-100 rounded" />
              </TableHead>
              <TableHead>
                <div className="h-4 w-16 animate-pulse bg-gray-100 rounded" />
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  <div className="h-4 w-12 animate-pulse bg-gray-100 rounded" />
                  <div className="h-3 w-3 animate-pulse bg-gray-100 rounded" />
                </div>
              </TableHead>
              <TableHead>
                <div className="h-4 w-12 animate-pulse bg-gray-100 rounded" />
              </TableHead>
              <TableHead>
                <div className="h-4 w-8 animate-pulse bg-gray-100 rounded" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-48 animate-pulse bg-gray-100 rounded" />
                    {i % 3 === 0 && (
                      <div className="flex items-center gap-1">
                        <div className="h-3.5 w-3.5 animate-pulse bg-gray-100 rounded" />
                        <div className="h-3 w-3 animate-pulse bg-gray-100 rounded" />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="h-6 w-14 animate-pulse bg-green-50 border border-green-100 rounded-md" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-24 animate-pulse bg-gray-100 rounded" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-20 animate-pulse bg-gray-100 rounded" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-16 animate-pulse bg-gray-100 rounded" />
                </TableCell>
                <TableCell>
                  <div className="h-8 w-8 animate-pulse bg-gray-100 rounded" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  // 빈 상태
  if (!isLoading && interviews.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 h-full flex items-center justify-center">
        <div className="flex flex-col items-center justify-center py-16">
          <FileText className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">아직 인터뷰가 없습니다</h3>
          <p className="mt-2 text-sm text-gray-500">
            첫 번째 인터뷰를 추가해보세요
          </p>
        </div>
      </div>
    )
  }

  const displayedData = processedData.slice(0, visibleRows)
  const filteredRows = table.getRowModel().rows

  return (
    <div className="w-full h-full flex flex-col">
      {/* 검색 바 - 고정 */}
      <div className="flex-shrink-0 sticky top-0 bg-white z-10 pb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="인터뷰 검색..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* 테이블 - 스크롤 영역 */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="bg-white">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {filteredRows.length ? (
              <>
                {filteredRows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="cursor-pointer"
                    onClick={(e) => {
                      const target = e.target as HTMLElement
                      if (!target.closest('[role="menuitem"]') && !target.closest('button')) {
                        onView(row.original.id)
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {/* 더 많은 데이터가 있으면 로딩 인디케이터 표시 */}
                {visibleRows < processedData.length && !isLoading && (
                  <TableRow ref={ref}>
                    <TableCell colSpan={columns.length} className="text-center py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">더 불러오는 중...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  검색 결과가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        
        {/* 총 개수 표시 */}
        {filteredRows.length > 0 && (
          <div className="px-4 py-3 text-sm text-gray-600 border-t">
            {visibleRows >= processedData.length 
              ? `총 ${processedData.length}개 인터뷰`
              : `${Math.min(visibleRows, processedData.length)}개 표시 중 (총 ${processedData.length}개)`
            }
          </div>
        )}
      </div>
    </div>
  )
}