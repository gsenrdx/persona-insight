'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { UnifiedPresenceUser } from '@/lib/realtime/unified-presence/types'

interface GoogleStylePresenceProps {
  users: UnifiedPresenceUser[]
  className?: string
  maxVisible?: number
}

interface SimpleAvatarProps {
  user: UnifiedPresenceUser
  index: number
}

function SimpleAvatar({ user, index }: SimpleAvatarProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  
  return (
    <div className="relative">
      <motion.div
        className="w-8 h-8 rounded-full border-2 border-white shadow-sm cursor-pointer overflow-hidden"
        style={{ backgroundColor: user.color }}
        whileHover={{ scale: 1.05 }}
        onHoverStart={() => setShowTooltip(true)}
        onHoverEnd={() => setShowTooltip(false)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ delay: index * 0.03, duration: 0.2 }}
      >
        {user.avatarUrl ? (
          <img 
            src={user.avatarUrl} 
            alt={`${user.userName} 아바타`} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white font-medium text-sm">
            {user.userName.charAt(0).toUpperCase()}
          </div>
        )}
      </motion.div>
      
      {/* 깔끔한 툴팁 - 레이아웃 안짤리게 */}
      {showTooltip && (
        <div className="fixed z-50 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg"
            style={{
              position: 'absolute',
              top: -35,
              left: '50%',
              transform: 'translateX(-50%)'
            }}
          >
            {user.userName}
          </motion.div>
        </div>
      )}
    </div>
  )
}

export function GoogleStylePresence({
  users,
  className,
  maxVisible = 6
}: GoogleStylePresenceProps) {
  
  if (!users || users.length === 0) {
    return null
  }
  
  const displayUsers = users.slice(0, maxVisible)
  const remainingCount = users.length - maxVisible
  
  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex items-center -space-x-1">
        <AnimatePresence>
          {displayUsers.map((user, index) => (
            <motion.div
              key={user.userId}
              style={{ zIndex: displayUsers.length - index }}
            >
              <SimpleAvatar user={user} index={index} />
            </motion.div>
          ))}
        </AnimatePresence>
        
        {remainingCount > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-8 h-8 bg-gray-100 border-2 border-white rounded-full flex items-center justify-center text-xs font-medium text-gray-600 shadow-sm ml-1"
          >
            +{remainingCount}
          </motion.div>
        )}
      </div>
    </div>
  )
}