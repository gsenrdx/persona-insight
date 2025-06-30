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
import { MoreHorizontal, ArrowUpDown } from "lucide-react"

export const createInterviewColumns = (
  onView: (id: string) => void,
  onDelete?: (id: string) => void
): ColumnDef<Interview>[] => [
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          제목
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <div className="font-medium">{row.getValue("title") || "제목 없음"}</div>
    },
  },
  {
    accessorKey: "status",
    header: "상태",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      const statusMap = {
        completed: { label: "완료", variant: "default" as const },
        processing: { label: "분석중", variant: "secondary" as const },
        pending: { label: "대기중", variant: "outline" as const },
        failed: { label: "실패", variant: "destructive" as const },
      }
      const config = statusMap[status as keyof typeof statusMap] || { label: status, variant: "outline" as const }
      return <Badge variant={config.variant}>{config.label}</Badge>
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
    accessorKey: "note_count",
    header: "노트",
    cell: ({ row }) => {
      const count = row.getValue("note_count") as number
      return <div className="text-center">{count || 0}</div>
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          생성일
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return (
        <div className="text-muted-foreground">
          {format(new Date(row.getValue("created_at")), "yyyy.MM.dd")}
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
            {onDelete && (
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