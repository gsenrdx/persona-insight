'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { AnimatePresence, motion } from 'framer-motion'
import LoginForm from './login-form'
import SignupForm from './signup-form'

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultMode?: 'login' | 'signup'
}

export default function AuthModal({ open, onOpenChange, defaultMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // 모달이 닫힐 때 로그인 모드로 초기화
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setMode('login')
        setIsInitialLoad(true) // 다음에 열릴 때는 다시 초기 로드로 설정
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [open])

  const handleSwitchToSignup = () => {
    setMode('signup')
    setIsInitialLoad(false) // 모드 전환 시에는 애니메이션 활성화
  }
  
  const handleSwitchToLogin = () => {
    setMode('login')
    setIsInitialLoad(false) // 모드 전환 시에는 애니메이션 활성화
  }

  const handleOpenChange = (openState: boolean) => {
    if (openState) {
      // 모달이 열리기 전에 즉시 스크롤 처리
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
    } else {
      // 모달이 닫힐 때 스크롤 복원
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
    onOpenChange(openState)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="border-0 bg-white shadow-2xl rounded-3xl p-0 gap-0 w-full max-w-2xl focus:outline-none [&>button]:hidden
                   animate-none duration-0"
        style={{
          maxHeight: 'calc(100vh - 2rem)',
        }}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <DialogTitle>
            {mode === 'login' ? '로그인' : '회원가입'}
          </DialogTitle>
        </VisuallyHidden>
        
        {/* 처음 로드 시에는 애니메이션 없음 */}
        <motion.div
          initial={{ opacity: isInitialLoad ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: isInitialLoad ? 0 : 0.15 }}
          className="flex max-h-full flex-col overflow-hidden rounded-3xl"
        >
          <div className="overflow-y-auto">
            <AnimatePresence mode="wait">
              {mode === 'login' ? (
                <LoginForm 
                  key="login"
                  onSwitchToSignup={handleSwitchToSignup} 
                  onClose={() => onOpenChange(false)}
                  disableAnimation={isInitialLoad}
                />
              ) : (
                <SignupForm 
                  key="signup"
                  onSwitchToLogin={handleSwitchToLogin} 
                  onClose={() => onOpenChange(false)}
                  disableAnimation={isInitialLoad}
                />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
} 