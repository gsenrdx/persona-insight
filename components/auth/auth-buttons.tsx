'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { LogIn, AlertTriangle } from 'lucide-react'
import AuthModal from './auth-modal'
import UserMenu from './user-menu'

export default function AuthButtons() {
  const { user, loading, error } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login')

  const handleAuthClick = () => {
    setAuthModalMode('login')
    setAuthModalOpen(true)
  }

  if (loading) {
    return <div className="h-9 w-16 bg-gray-200 rounded animate-pulse" />
  }

  if (error) {
    return (
      <Button 
        size="sm"
        variant="outline"
        onClick={() => window.location.reload()}
        className="text-sm font-medium text-amber-600 border-amber-200 hover:bg-amber-50"
      >
        <AlertTriangle className="mr-2 h-4 w-4" />
        새로고침
      </Button>
    )
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