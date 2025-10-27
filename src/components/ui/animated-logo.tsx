'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

export function AnimatedLogo() {
    const pathname = usePathname()
    
    // Always start with loaded state to ensure server/client match
    const [cornerAnimated, setCornerAnimated] = useState(true)
    const [spriteAnimated, setSpriteAnimated] = useState(true)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    useEffect(() => {
        // Only run animation after component is mounted and on main page
        if (isMounted && pathname === '/') {
            // Reset states to trigger animation
            setCornerAnimated(false)
            setSpriteAnimated(false)
            
            // Corner slides in after 3 seconds
            const cornerTimer = setTimeout(() => {
                setCornerAnimated(true)
            }, 3800) // 3s delay + 0.8s animation
            
            // Sprite rolls in 1 second after corner starts (4 seconds total)
            const spriteTimer = setTimeout(() => {
                setSpriteAnimated(true)
            }, 5000) // 4s delay + 1s animation

            return () => {
                clearTimeout(cornerTimer)
                clearTimeout(spriteTimer)
            }
        }
    }, [isMounted, pathname])

    // Always use loaded classes until after mount + animation state changes
    const cornerClass = (isMounted && pathname === '/' && !cornerAnimated) 
        ? 'corner-slide-entrance' 
        : 'corner-slide-loaded'
    
    const spriteClass = (isMounted && pathname === '/' && !spriteAnimated) 
        ? 'un20-roll-entrance' 
        : 'un20-roll-loaded'

    return (
        <div suppressHydrationWarning>
            <a
                href="https://un-two-zero.network/"
                target="_blank"
                rel="noopener noreferrer"
                className={`fixed bottom-0 left-0 z-30 cursor-pointer transition-opacity hover:opacity-80 ${cornerClass}`}
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
                        className={`block ${spriteClass}`}
                    />
                </div>
            </a>
        </div>
    )
}