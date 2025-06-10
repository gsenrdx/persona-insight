'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { User, LogOut, Building2, AlertTriangle, RefreshCw, Crown, Shield } from 'lucide-react'
import ProfileModal from './profile-modal'

const ROLE_LABELS = {
  super_admin: '시스템 관리자',
  company_admin: '회사 관리자',
  company_user: '일반 사용자',
} as const

const ROLE_ICONS = {
  super_admin: Crown,
  company_admin: Shield,
  company_user: User,
} as const

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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive'
      case 'company_admin':
        return 'default'
      default:
        return 'secondary'
    }
  }

  const getRoleIcon = (role: string) => {
    return ROLE_ICONS[role as keyof typeof ROLE_ICONS] || User
  }

  if (!user) return null

  // 에러가 있는 경우 에러 메뉴 표시
  if (error || !profile) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="relative h-10 text-amber-600 border-amber-200 hover:bg-amber-50">
            <AlertTriangle className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div className="flex flex-col">
                  <p className="text-sm font-medium leading-none text-amber-700">프로필 로드 실패</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>
              {error && (
                <p className="text-xs text-amber-600">{error}</p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={refreshProfile}>
            <RefreshCw className="mr-2 h-4 w-4" />
            <span>다시 시도</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleSignOut}
            disabled={loading}
            className="text-red-600 focus:text-red-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>로그아웃</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 px-3 text-sm font-medium">
            <div className="flex items-center gap-1.5">
              {(() => {
                const RoleIcon = getRoleIcon(profile.role)
                return <RoleIcon className="h-4 w-4" />
              })()}
              {profile.name}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile.avatar_url || ''} alt={profile.name} />
                  <AvatarFallback className="bg-primary/10 text-xs">
                    {getInitials(profile.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <p className="text-sm font-medium leading-none">{profile.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant={getRoleBadgeVariant(profile.role)} className="text-xs">
                  <div className="flex items-center gap-1">
                    {(() => {
                      const RoleIcon = getRoleIcon(profile.role)
                      return <RoleIcon className="h-3 w-3" />
                    })()}
                    {ROLE_LABELS[profile.role]}
                  </div>
                </Badge>
                {profile.company && (
                  <Badge variant="outline" className="text-xs">
                    <Building2 className="mr-1 h-3 w-3" />
                    {profile.company.name}
                  </Badge>
                )}
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setProfileModalOpen(true)}>
            <User className="mr-2 h-4 w-4" />
            <span>프로필</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleSignOut}
            disabled={loading}
            className="text-red-600 focus:text-red-600"
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
    </>
  )
} 