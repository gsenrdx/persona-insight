'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

export const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  in: {
    opacity: 1,
    y: 0,
  },
  out: {
    opacity: 0,
    y: -20,
  },
}

export const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.4
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Table row animation variants
export const tableRowVariants = {
  initial: { 
    opacity: 0
  },
  animate: (i: number = 0) => ({ 
    opacity: 1,
    transition: {
      delay: i * 0.02,
      duration: 0.15,
      ease: "easeOut"
    }
  }),
  hover: {},
  tap: {
    scale: 0.995,
    transition: {
      duration: 0.05
    }
  }
}

// Project card animation variants
export const projectCardVariants = {
  initial: { 
    opacity: 0, 
    y: 8
  },
  animate: (i: number = 0) => ({ 
    opacity: 1, 
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.2,
      ease: "easeOut"
    }
  }),
  hover: { 
    y: -4,
    transition: { 
      duration: 0.2,
      ease: "easeOut"
    }
  },
  tap: { 
    scale: 0.98,
    transition: { 
      duration: 0.05 
    }
  }
}

// Stagger container variants
export const staggerContainerVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
}

// Fade transition for switching views
export const fadeVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeInOut"
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: "easeInOut"
    }
  }
}