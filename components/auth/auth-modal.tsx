'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import LoginForm from './login-form'
import SignupForm from './signup-form'

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultMode?: 'login' | 'signup'
}

export default function AuthModal({ open, onOpenChange, defaultMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode)

  // 모달이 열릴 때 defaultMode로 초기화
  useEffect(() => {
    if (open) {
      setMode(defaultMode)
    }
  }, [open, defaultMode])

  const handleSwitchToSignup = () => {
    setMode('signup')
  }
  
  const handleSwitchToLogin = () => {
    setMode('login')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md p-0 overflow-hidden border-0 shadow-xl">
        <VisuallyHidden>
          <DialogTitle>
            {mode === 'login' ? '로그인' : '회원가입'}
          </DialogTitle>
        </VisuallyHidden>
        
        <div className="p-8">
          {mode === 'login' ? (
            <LoginForm 
              onSwitchToSignup={handleSwitchToSignup} 
              onClose={() => onOpenChange(false)}
            />
          ) : (
            <SignupForm 
              onSwitchToLogin={handleSwitchToLogin} 
              onClose={() => onOpenChange(false)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 