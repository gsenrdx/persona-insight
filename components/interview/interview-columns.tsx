"use client"

import { useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Interview } from "@/types/interview"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, ArrowUp, ArrowDown, ChevronsUpDown, Loader2, RotateCw, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export const createInterviewColumns = (
  onView: (id: string) => void,
  onDelete?: (id: string) => void,
  currentUserId?: string,
  onRetry?: (id: string) => void,
  isAdmin?: boolean,
  onAssignPersona?: (interviewId: string) => void,
  projectId?: string
): ColumnDef<Interview>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex justify-center">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
        />
      </div>
    ),
    cell: ({ row }) => {
      const isConfirmed = !!row.original.confirmed_persona_definition_id
      return (
        <div className="flex justify-center">
          <input
            type="checkbox"
            className={cn(
              "h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500",
              isConfirmed && "opacity-30 cursor-not-allowed"
            )}
            checked={row.getIsSelected()}
            onChange={(e) => {
              if (!isConfirmed) {
                row.toggleSelected(e.target.checked)
              }
            }}
            onClick={(e) => e.stopPropagation()}
            disabled={isConfirmed}
          />
        </div>
      )
    },
    size: 40,
  },
  {
    accessorKey: "status",
    header: () => <span className="pl-2">처리 상태</span>,
    size: 100,
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      const metadata = row.original.metadata as any
      const statusMap = {
        completed: { label: "완료", className: "bg-green-50 text-green-700 border-green-200" },
        processing: { label: "분석중", className: "bg-blue-50 text-blue-700 border-blue-200" },
        pending: { label: "대기중", className: "bg-gray-50 text-gray-700 border-gray-200" },
        failed: { label: "실패", className: "bg-red-50 text-red-700 border-red-200" },
      }
      const config = statusMap[status as keyof typeof statusMap] || { label: status, className: "bg-gray-100 text-gray-700" }
      
      return (
        <div className="flex items-center gap-2 pl-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${config.className}`}>
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
    accessorKey: "title",
    size: 300,
    header: ({ column }) => {
      const sorted = column.getIsSorted()
      return (
        <button
          className="flex items-center gap-1 hover:text-gray-900 transition-colors group pl-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          제목
          {sorted === "asc" ? (
            <ArrowUp className="h-3 w-3 text-gray-600" />
          ) : sorted === "desc" ? (
            <ArrowDown className="h-3 w-3 text-gray-600" />
          ) : (
            <ChevronsUpDown className="h-3 w-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>
      )
    },
    cell: ({ row }) => {
      return (
        <div className="pl-2 min-w-0">
          <span className="text-sm font-medium text-gray-900 truncate block">{row.getValue("title") || "제목 없음"}</span>
        </div>
      )
    },
  },
  {
    id: "persona",
    header: () => <span className="pl-2">페르소나 분류</span>,
    size: 150,
    cell: ({ row }) => {
      const confirmedPersonaDefinitionId = row.original.confirmed_persona_definition_id // 확정된 페르소나 ID
      const confirmedPersonaDefinition = row.original.confirmed_persona_definition // 확정된 페르소나 관계 데이터
      const aiPersonaMatch = row.original.ai_persona_match // AI 추천 persona_definitions ID
      const aiPersonaDefinition = row.original.ai_persona_definition // AI 추천 관계 데이터
      
      // 페르소나가 전혀 없는 경우
      if (!confirmedPersonaDefinitionId && !aiPersonaMatch && !aiPersonaDefinition) return <span className="text-sm text-gray-500 pl-2">-</span>
      
      // 페르소나별 형광펜 색상 매핑
      const getPersonaHighlightColor = (name: string | null | undefined) => {
        if (!name) return { bg: 'bg-gray-200/60', text: 'text-gray-900' }
        
        // 일관된 색상을 위해 문자열 해시 생성
        let hash = 0
        for (let i = 0; i < name.length; i++) {
          hash = name.charCodeAt(i) + ((hash << 5) - hash)
        }
        
        // 형광펜 효과를 위한 밝은 색상 팔레트
        const colors = [
          { bg: 'bg-yellow-200/60', text: 'text-yellow-900' },
          { bg: 'bg-green-200/60', text: 'text-green-900' },
          { bg: 'bg-blue-200/60', text: 'text-blue-900' },
          { bg: 'bg-pink-200/60', text: 'text-pink-900' },
          { bg: 'bg-purple-200/60', text: 'text-purple-900' },
          { bg: 'bg-orange-200/60', text: 'text-orange-900' },
          { bg: 'bg-cyan-200/60', text: 'text-cyan-900' },
          { bg: 'bg-lime-200/60', text: 'text-lime-900' },
          { bg: 'bg-rose-200/60', text: 'text-rose-900' },
          { bg: 'bg-indigo-200/60', text: 'text-indigo-900' },
        ]
        
        // 해시값을 기반으로 색상 선택
        return colors[Math.abs(hash) % colors.length]
      }
      
      // confirmed_persona_definition_id가 있는 경우 (확정된 경우) - 형광펜 스타일
      if (confirmedPersonaDefinitionId) {
        // confirmed_persona_definition 관계 데이터가 있으면 그것을 사용, 없으면 ai_persona_definition 사용
        let displayName = ''
        if (confirmedPersonaDefinition) {
          displayName = confirmedPersonaDefinition.name_ko
        } else if (aiPersonaDefinition) {
          // confirmed_persona_definition 관계 데이터가 없는 경우 AI 추천 데이터 사용
          displayName = aiPersonaDefinition.name_ko
        }
        
        if (displayName) {
          const color = getPersonaHighlightColor(displayName)
          
          return (
            <div className="pl-2 min-w-0">
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
                color?.bg || 'bg-gray-200/60', color?.text || 'text-gray-900'
              )}>
                <Check className="h-3 w-3" />
                {displayName}
              </span>
            </div>
          )
        }
      }
      
      // confirmed_persona_definition_id가 null인 경우 (미확정) - AI 추천과 버튼 표시
      return (
        <div className="pl-2 min-w-0 flex items-center gap-2">
          {aiPersonaDefinition && (
            <span className="text-xs text-gray-500">
              추천: {aiPersonaDefinition.name_ko}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              if (onAssignPersona) {
                onAssignPersona(row.original.id)
              }
            }}
          >
            확정하기
          </Button>
        </div>
      )
    },
  },
  {
    accessorKey: "created_at",
    size: 120,
    header: ({ column }) => {
      const sorted = column.getIsSorted()
      return (
        <button
          className="flex items-center gap-1 hover:text-gray-900 transition-colors group pl-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          생성일시
          {sorted === "asc" ? (
            <ArrowUp className="h-3 w-3 text-gray-600" />
          ) : sorted === "desc" ? (
            <ArrowDown className="h-3 w-3 text-gray-600" />
          ) : (
            <ChevronsUpDown className="h-3 w-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>
      )
    },
    cell: ({ row }) => {
      return (
        <div className="text-sm text-gray-700 pl-2">
          {format(new Date(row.getValue("created_at")), "yy.M.d HH:mm")}
        </div>
      )
    },
  },
  {
    id: "created_by",
    header: () => <span className="pl-2">생성자</span>,
    size: 100,
    cell: ({ row }) => {
      const createdByProfile = row.original.created_by_profile
      return (
        <div className="text-sm text-gray-700 pl-2 truncate max-w-[100px]">
          {createdByProfile?.name || "-"}
        </div>
      )
    },
  },
  {
    id: "actions",
    size: 50,
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