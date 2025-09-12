'use client'

import { useState, useEffect } from 'react'
import { ChevronUp } from 'lucide-react'
import { Button } from './button'

interface ScrollToTopProps {
  className?: string
}

export function ScrollToTop({ className }: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when user scrolls down 300px
      setIsVisible(window.scrollY > 300)
    }

    window.addEventListener('scroll', toggleVisibility, { passive: true })

    return () => {
      window.removeEventListener('scroll', toggleVisibility)
    }
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  if (!isVisible) return null

  return (
    <Button
      onClick={scrollToTop}
      className={`h-12 w-12 rounded-full bg-white border border-gray-200 shadow-lg hover:bg-gray-50 transition-all duration-200 hover:shadow-xl ${className || ''}`}
      variant="ghost"
      size="icon"
      aria-label="Scroll to top"
    >
      <ChevronUp className="h-5 w-5 text-gray-700" />
    </Button>
  )
}
