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
  getPaginationRowModel,
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createInterviewColumns } from "./interview-columns"
import { FileText, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface InterviewDataTableProps {
  interviews: Interview[]
  onView: (id: string) => void
  onDelete?: (id: string) => void
  isLoading?: boolean
  currentUserId?: string
  presence?: Record<string, any[]>
  onRetry?: (id: string) => void
  isAdmin?: boolean
}

export function InterviewDataTable({
  interviews,
  onView,
  onDelete,
  isLoading,
  currentUserId,
  presence,
  onRetry,
  isAdmin,
}: InterviewDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "created_at", desc: true },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const columns = React.useMemo(
    () => createInterviewColumns(onView, onDelete, currentUserId, presence, onRetry, isAdmin),
    [onView, onDelete, currentUserId, presence, onRetry, isAdmin]
  )

  // 데이터가 변경될 때 페이지 인덱스가 범위를 벗어날 경우만 리셋
  React.useEffect(() => {
    const pageCount = Math.ceil(interviews.length / pagination.pageSize)
    if (pagination.pageIndex >= pageCount && pageCount > 0) {
      setPagination(prev => ({ ...prev, pageIndex: pageCount - 1 }))
    }
  }, [interviews.length, pagination.pageSize, pagination.pageIndex])

  const table = useReactTable({
    data: interviews,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
  })

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="w-full">
        {/* 검색 바 스켈레톤 */}
        <div className="flex items-center py-4">
          <div className="relative flex-1 max-w-sm">
            <div className="h-9 w-full animate-pulse bg-gray-100 rounded-md" />
          </div>
        </div>
        
        {/* 테이블 스켈레톤 - 윤곽선 없는 스타일 */}
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
            {Array.from({ length: 5 }).map((_, i) => (
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
        
        {/* 페이지네이션 스켈레톤 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <div className="h-4 w-24 animate-pulse bg-gray-100 rounded" />
          <div className="flex items-center gap-1">
            <div className="h-8 w-16 animate-pulse bg-gray-100 rounded-md" />
            <div className="h-8 w-16 animate-pulse bg-gray-100 rounded-md" />
          </div>
        </div>
      </div>
    )
  }

  // 빈 상태 (로딩이 완료되었고 데이터가 없을 때만)
  if (!isLoading && interviews.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
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

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
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
      <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
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
              ))
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
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          총 {table.getFilteredRowModel().rows.length}개 인터뷰
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              !table.getCanPreviousPage()
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              !table.getCanNextPage()
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}