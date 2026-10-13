'use client'

import { use, useEffect } from 'react'

/** This boundary delivers metadata only; the surrounding table stays mounted. */
export function AgendaCountResult<T>({
  promise,
  onReady,
}: {
  promise: Promise<T>
  onReady: (promise: Promise<T>, result: T) => void
}) {
  const result = use(promise)
  useEffect(() => onReady(promise, result), [promise, result, onReady])
  return null
}

export function AgendaCountSkeleton({ label }: { label: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className="inline-flex w-12 justify-end align-middle"
    >
      <span
        aria-hidden
        className="h-3 w-7 rounded-sm bg-muted motion-safe:animate-pulse"
      />
    </span>
  )
}
