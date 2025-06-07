'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { LogIn } from 'lucide-react'
import AuthModal from './auth-modal'
import UserMenu from './user-menu'

export default function AuthButtons() {
  const { user, loading } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login')

  const handleAuthClick = () => {
    setAuthModalMode('login')
    setAuthModalOpen(true)
  }

  if (loading) {
    return <div className="h-9 w-16 bg-muted rounded animate-pulse" />
  }

  if (user) {
    return <UserMenu />
  }

  return (
    <>
      <Button 
        size="sm"
        onClick={handleAuthClick}
        className="text-sm font-medium"
      >
        <LogIn className="mr-2 h-4 w-4" />
        로그인
      </Button>
      <AuthModal 
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultMode={authModalMode}
      />
    </>
  )
} 