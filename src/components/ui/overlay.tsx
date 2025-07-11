'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from './button'

interface OverlayProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  wide?: boolean
}

export function Overlay({ isOpen, onClose, children, title, wide = false }: OverlayProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay Panel */}
      <div 
        className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl h-full bg-background shadow-xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        } mx-auto`}
      >
        {/* Header */}
        <div className="flex items-center relative border-b px-8 sm:px-12 lg:px-16 py-6">
          {title && (
            <h2 className="text-xl font-semibold truncate pr-8">{title}</h2>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute right-8 sm:right-12 lg:right-16 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="h-[calc(100vh-80px)] overflow-y-auto px-8 sm:px-12 lg:px-16">
          {children}
        </div>
      </div>
    </div>
  )
} 