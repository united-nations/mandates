'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

const styles = `
  @keyframes corner-slide-in {
    0% { opacity: 0; transform: translateX(-120px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  @keyframes un20-roll-in {
    0% { opacity: 0; transform: translateX(-60px) rotate(-360deg) scale(0.3); }
    70% { opacity: 0.8; transform: translateX(0) rotate(0deg) scale(1.1); }
    100% { opacity: 1; transform: translateX(0) rotate(0deg) scale(1); }
  }
  .corner-slide-entrance {
    animation: corner-slide-in 0.8s ease-out forwards;
    animation-delay: 3s;
    opacity: 0;
    transform: translateX(-120px);
  }
  .corner-slide-loaded { opacity: 1; transform: translateX(0); }
  .corner-slide-hidden { opacity: 0; transform: translateX(-120px); }
  .un20-roll-entrance {
    animation: un20-roll-in 1s ease-out forwards;
    animation-delay: 4s;
    opacity: 0;
    transform: translateX(-60px) rotate(-360deg) scale(0.3);
  }
  .un20-roll-loaded { opacity: 1; transform: translateX(0) rotate(0deg) scale(1); }
  .un20-roll-hidden { opacity: 0; transform: translateX(-60px) rotate(-360deg) scale(0.3); }
`

export function AnimatedLogo() {
  const pathname = usePathname()

  // Always start hidden to prevent flash
  const [cornerClass, setCornerClass] = useState('corner-slide-hidden')
  const [spriteClass, setSpriteClass] = useState('un20-roll-hidden')

  useEffect(() => {
    // Only animate on home page
    if (pathname !== '/') return

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

  // Only render on main page
  if (pathname !== '/') return null

  return (
    <div>
      <style>{styles}</style>
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
          unoptimized
          className="block"
        />
        {/* UN20 Animation Sprite on top */}
        <div className="absolute inset-0 flex items-center justify-start pt-2 pl-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/un20animation.svg"
            alt="UN20 Animation"
            width={31}
            height={29}
            className={spriteClass}
          />
        </div>
      </a>
    </div>
  )
}
