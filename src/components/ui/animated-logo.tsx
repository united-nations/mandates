'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

export function AnimatedLogo() {
    const pathname = usePathname()
    const isMainPage = pathname === '/'
    
    const [animationComplete, setAnimationComplete] = useState(true) // Start with completed state
    const [shouldAnimate, setShouldAnimate] = useState(false)

    useEffect(() => {
        // Only run animation on the main page and only on client side
        if (isMainPage && typeof window !== 'undefined') {
            setShouldAnimate(true)
            setAnimationComplete(false)
            
            // Trigger animation completion after the entrance animation
            const timer = setTimeout(() => {
                setAnimationComplete(true)
            }, 2000) // 0.5s delay + 1.5s animation

            return () => clearTimeout(timer)
        }
    }, [isMainPage])

    return (
        <a
            href="https://un-two-zero.network/"
            target="_blank"
            rel="noopener noreferrer"
            className='fixed bottom-0 left-0 z-30 cursor-pointer transition-opacity hover:opacity-80'
            aria-label="Visit UN 2.0 Network"
        >
            {/* Base corner logo */}
            <Image
                src="/corner_un80.svg"
                alt="UN80 Logo"
                width={100}
                height={100}
                className="block"
            />
            {/* UN20 Animation Sprite on top */}
            <div className='absolute inset-0 flex items-center justify-start pl-3 pt-2'>
                <Image
                    src="/un20animation.svg"
                    alt="UN20 Animation"
                    width={30}
                    height={30}
                    className={`block ${
                        shouldAnimate && !animationComplete
                            ? 'un20-animation-entrance'
                            : 'un20-animation-loaded'
                    }`}
                />
            </div>
        </a>
    )
}