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
import { LogOut, User, HelpCircle, Database, ChevronDown } from 'lucide-react'
import ProfileModal from './profile-modal'
import { MisoKnowledgeStatusModal } from '@/components/modal/miso-knowledge-status-modal'

export default function UserMenu() {
  const { user, profile, signOut } = useAuth()
  const [loading, setLoading] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [knowledgeStatusOpen, setKnowledgeStatusOpen] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await signOut()
    } catch (error) {
      // 로그아웃 실패 시 에러 처리
    } finally {
      setLoading(false)
    }
  }

  const guideLink = 'https://miso.oopy.io/persona-insight'

  if (!user) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="h-9 px-3 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
          >
            <span>{profile?.name || '사용자'}</span>
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{profile?.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setProfileModalOpen(true)}>
            <User className="mr-2 h-4 w-4" />
            <span>프로필 설정</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => setKnowledgeStatusOpen(true)}>
            <Database className="mr-2 h-4 w-4" />
            <span>MISO Knowledge 상태</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => window.open(guideLink, '_blank')}>
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>도움말</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={handleSignOut}
            disabled={loading}
            className="text-red-600 focus:text-red-600 dark:text-red-400"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>로그아웃</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 프로필 모달 */}
      <ProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
      />
      
      {/* MISO Knowledge 연동 상태 모달 */}
      <MisoKnowledgeStatusModal
        open={knowledgeStatusOpen}
        onOpenChange={setKnowledgeStatusOpen}
        companyId={profile?.company_id || ''}
      />
    </>
  )
}