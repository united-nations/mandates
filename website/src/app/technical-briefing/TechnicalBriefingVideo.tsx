'use client'

import { useRef, type MouseEvent } from 'react'

const VIDEO_ID = 'EHlQGY91owc'
const EMBED_URL = `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?playsinline=1`
const WATCH_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`

export function TechnicalBriefingVideo({
  title,
  chaptersHeading,
  chapters,
}: {
  title: string
  chaptersHeading: string
  chapters: readonly { seconds: number; title: string }[]
}) {
  const playerRef = useRef<HTMLIFrameElement>(null)

  function playChapter(event: MouseEvent<HTMLAnchorElement>, seconds: number) {
    const player = playerRef.current
    if (
      !player ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    event.preventDefault()
    player.src = `${EMBED_URL}&start=${seconds}&autoplay=1`
    player.scrollIntoView({ block: 'start' })
  }

  return (
    <>
      <iframe
        ref={playerRef}
        src={EMBED_URL}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="aspect-video h-auto w-full scroll-mt-[calc(var(--site-header-height,0px)+1rem)] rounded-md border-0"
      />
      <section aria-labelledby="briefing-chapters">
        <h2 id="briefing-chapters" className="mb-2 text-lg font-semibold">
          {chaptersHeading}
        </h2>
        <ol>
          {chapters.map(({ seconds, title: chapterTitle }) => {
            const minutes = String(Math.floor(seconds / 60)).padStart(2, '0')
            const remainder = String(seconds % 60).padStart(2, '0')

            return (
              <li key={seconds}>
                <a
                  href={`${WATCH_URL}&t=${seconds}s`}
                  onClick={(event) => playChapter(event, seconds)}
                  className="inline-flex gap-3 py-1 hover:text-un-blue-text"
                >
                  <span className="font-medium text-un-blue-text tabular-nums underline">
                    {minutes}:{remainder}
                  </span>
                  {chapterTitle}
                </a>
              </li>
            )
          })}
        </ol>
      </section>
    </>
  )
}
