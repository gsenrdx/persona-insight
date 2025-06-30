"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Interview } from "@/types/interview"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, ArrowUpDown, ArrowUp, ArrowDown, ChevronsUpDown, MessageSquare } from "lucide-react"

export const createInterviewColumns = (
  onView: (id: string) => void,
  onDelete?: (id: string) => void,
  currentUserId?: string
): ColumnDef<Interview>[] => [
  {
    accessorKey: "title",
    header: ({ column }) => {
      const sorted = column.getIsSorted()
      return (
        <button
          className="flex items-center gap-1 hover:text-gray-900 transition-colors group"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          제목
          {sorted === "asc" ? (
            <ArrowUp className="h-3 w-3 text-blue-600" />
          ) : sorted === "desc" ? (
            <ArrowDown className="h-3 w-3 text-blue-600" />
          ) : (
            <ChevronsUpDown className="h-3 w-3 text-gray-400 group-hover:text-gray-600" />
          )}
        </button>
      )
    },
    cell: ({ row }) => {
      const noteCount = row.original.note_count || 0
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.getValue("title") || "제목 없음"}</span>
          {noteCount > 0 && (
            <div className="flex items-center gap-1 text-gray-500">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="text-xs">{noteCount}</span>
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: "상태",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      const statusMap = {
        completed: { label: "완료", className: "bg-green-100 text-green-700 border-green-200" },
        processing: { label: "분석중", className: "bg-blue-100 text-blue-700 border-blue-200" },
        pending: { label: "대기중", className: "bg-gray-100 text-gray-700 border-gray-200" },
        failed: { label: "실패", className: "bg-red-100 text-red-700 border-red-200" },
      }
      const config = statusMap[status as keyof typeof statusMap] || { label: status, className: "bg-gray-100 text-gray-700" }
      return <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${config.className}`}>{config.label}</span>
    },
  },
  {
    id: "interviewee",
    header: "인터뷰이",
    cell: ({ row }) => {
      const demographics = row.original.interviewee_profile?.[0]?.demographics
      if (!demographics) return <span className="text-muted-foreground">-</span>
      
      const info = [demographics.age_group, demographics.gender].filter(Boolean).join(" · ")
      return <div className="text-sm">{info || "-"}</div>
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => {
      const sorted = column.getIsSorted()
      return (
        <button
          className="flex items-center gap-1 hover:text-gray-900 transition-colors group"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          생성일
          {sorted === "asc" ? (
            <ArrowUp className="h-3 w-3 text-blue-600" />
          ) : sorted === "desc" ? (
            <ArrowDown className="h-3 w-3 text-blue-600" />
          ) : (
            <ChevronsUpDown className="h-3 w-3 text-gray-400 group-hover:text-gray-600" />
          )}
        </button>
      )
    },
    cell: ({ row }) => {
      return (
        <div className="text-sm text-gray-600">
          {format(new Date(row.getValue("created_at")), "yyyy.MM.dd")}
        </div>
      )
    },
  },
  {
    id: "created_by",
    header: "생성자",
    cell: ({ row }) => {
      const createdByProfile = row.original.created_by_profile
      return (
        <div className="text-sm text-gray-600">
          {createdByProfile?.name || "-"}
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const interview = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">메뉴 열기</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(interview.id)}>
              상세보기
            </DropdownMenuItem>
            {onDelete && currentUserId && interview.created_by === currentUserId && (
              <DropdownMenuItem 
                onClick={() => onDelete(interview.id)}
                className="text-destructive"
              >
                삭제
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]