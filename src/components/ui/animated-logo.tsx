'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

export function AnimatedLogo() {
    const pathname = usePathname()
    
    // Only render on main page
    if (pathname !== '/') return null

    // Always start hidden to prevent flash
    const [cornerClass, setCornerClass] = useState('corner-slide-hidden')
    const [spriteClass, setSpriteClass] = useState('un20-roll-hidden')
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        // Mark as client-side and handle logic there
        setIsClient(true)
        
        // On home page, start the animation sequence
        const cornerTimer = setTimeout(() => {
            setCornerClass('corner-slide-entrance')
        }, 1500)

        // Sprite rolls in shortly after corner starts (200ms after corner -> 1700ms total)
        const spriteTimer = setTimeout(() => {
            setSpriteClass('un20-roll-entrance')
        }, 1200)

            return () => {
                clearTimeout(cornerTimer)
                clearTimeout(spriteTimer)
            }
        
    }, [pathname])

    return (
        <div>
            <a
                href="https://un-two-zero.network/"
                target="_blank"
                rel="noopener noreferrer"
                className={`fixed bottom-0 left-0 z-30 cursor-pointer transition-opacity hover:opacity-80 ${cornerClass}`}
                aria-label="Visit UN 2.0 Network"
            >
                {/* Base corner logo */}
                <Image
                    src="/images/corner_un80.svg"
                    alt="UN80 Logo"
                    width={110}
                    height={110}
                    className="block"
                />
                {/* UN20 Animation Sprite on top */}
                <div className='absolute inset-0 flex items-center justify-start pl-3 pt-2'>
                    <Image
                        src="/images/un20animation.svg"
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