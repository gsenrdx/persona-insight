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
import { MoreHorizontal, ArrowUpDown, ArrowUp, ArrowDown, ChevronsUpDown, MessageSquare, Eye, Loader2, RotateCw } from "lucide-react"
import { PresenceIndicatorCompact } from "@/components/ui/presence-indicator"

export const createInterviewColumns = (
  onView: (id: string) => void,
  onDelete?: (id: string) => void,
  currentUserId?: string,
  presence?: Record<string, any[]>,
  onRetry?: (id: string) => void,
  isAdmin?: boolean
): ColumnDef<Interview>[] => [
  {
    accessorKey: "title",
    header: ({ column }) => {
      const sorted = column.getIsSorted()
      return (
        <button
          className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-600 hover:text-gray-900 transition-colors group"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          제목
          {sorted === "asc" ? (
            <ArrowUp className="h-3 w-3 text-blue-500" />
          ) : sorted === "desc" ? (
            <ArrowDown className="h-3 w-3 text-blue-500" />
          ) : (
            <ChevronsUpDown className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>
      )
    },
    cell: ({ row }) => {
      const noteCount = row.original.note_count || 0
      const viewers = presence?.[row.original.id] || []
      
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{row.getValue("title") || "제목 없음"}</span>
          <div className="flex items-center gap-2">
            {noteCount > 0 && (
              <div className="flex items-center gap-1 text-gray-400">
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{noteCount}</span>
              </div>
            )}
            {viewers.length > 0 && (
              <PresenceIndicatorCompact 
                viewers={viewers}
                currentUserId={currentUserId}
              />
            )}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: () => <span className="text-xs font-medium uppercase tracking-wider text-gray-600">상태</span>,
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      const metadata = row.original.metadata as any
      const statusMap = {
        completed: { label: "완료", className: "bg-green-50 text-green-700 border-green-200 ring-1 ring-green-600/10" },
        processing: { label: "분석중", className: "bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-600/10" },
        pending: { label: "대기중", className: "bg-gray-50 text-gray-700 border-gray-200 ring-1 ring-gray-600/10" },
        failed: { label: "실패", className: "bg-red-50 text-red-700 border-red-200 ring-1 ring-red-600/10" },
      }
      const config = statusMap[status as keyof typeof statusMap] || { label: status, className: "bg-gray-100 text-gray-700" }
      
      return (
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
            {status === "processing" && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            {config.label}
          </span>
          {status === "failed" && onRetry && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                onRetry(row.original.id)
              }}
              title="다시 시도"
            >
              <RotateCw className="h-3 w-3" />
            </Button>
          )}
          {metadata?.processing_attempt > 1 && (
            <span className="text-xs text-gray-500">
              ({metadata.processing_attempt}회)
            </span>
          )}
        </div>
      )
    },
  },
  {
    id: "interviewee",
    header: () => <span className="text-xs font-medium uppercase tracking-wider text-gray-600">인터뷰이</span>,
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
          className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-600 hover:text-gray-900 transition-colors group"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          생성일
          {sorted === "asc" ? (
            <ArrowUp className="h-3 w-3 text-blue-500" />
          ) : sorted === "desc" ? (
            <ArrowDown className="h-3 w-3 text-blue-500" />
          ) : (
            <ChevronsUpDown className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
    header: () => <span className="text-xs font-medium uppercase tracking-wider text-gray-600">생성자</span>,
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
            {onDelete && currentUserId && (interview.created_by === currentUserId || isAdmin) && (
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