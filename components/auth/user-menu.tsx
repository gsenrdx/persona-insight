'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, ArrowUpRight, ChevronRight, ChevronDown, AlertCircle, Clock } from 'lucide-react'
import ProfileModal from './profile-modal'

export default function UserMenu() {
  const { user, profile, error, signOut, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await signOut()
    } catch (error) {
      console.error('로그아웃 실패:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // 버전 정보
  const version = 'v1.0.2'
  const updateDate = '2025.06.12'
  const updateLink = 'https://example.com/changelog'
  
  const handleUpdateClick = () => {
    window.open(updateLink, '_blank')
  }

  if (!user) return null

  // 정상 프로필 표시
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-1 h-8 py-1 px-2 text-left">
            <div className="font-medium text-sm">{profile?.name || '최정규'}</div>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48 p-0 shadow-md" align="end" alignOffset={-5} sideOffset={8}>
        <DropdownMenuItem 
            onClick={() => setProfileModalOpen(true)}
            className="flex justify-between items-center px-3 py-2 text-xs"
          >
            <span>내 정보 수정</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="flex justify-between items-center px-3 py-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span>업데이트 일자</span>
            </div>
            <span className="text-gray-500">{updateDate}</span>
          </DropdownMenuItem>
        
          <DropdownMenuItem 
            onClick={handleUpdateClick}
            className="flex justify-between items-center px-3 py-2 text-xs"
          >
            <span>업데이트 소식</span>
            <ArrowUpRight className="h-3 w-3" />
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="m-0" />
          
          <DropdownMenuSeparator className="m-0" />
          
          <DropdownMenuItem className="flex justify-between items-center px-3 py-2 text-xs">
            <span>관리 메뉴</span>
            <ChevronRight className="h-3 w-3" />
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="m-0" />
          
          <DropdownMenuItem 
            onClick={handleSignOut}
            disabled={loading}
            className="text-red-600 focus:text-red-600 px-3 py-2 text-xs"
          >
            <span>로그아웃</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 프로필 모달 */}
      <ProfileModal 
        open={profileModalOpen} 
        onOpenChange={setProfileModalOpen} 
      />
    </>
  )
} 