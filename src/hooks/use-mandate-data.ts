'use client'

import { useState, useEffect } from 'react'
import type { Mandate, Paragraph, Entity } from '@/types'

interface UseMandateDataParams {
  documentSymbol: string
}

interface MandateDataResponse {
  mandate: Mandate | null
  paragraphs: Paragraph[]
  entities: Entity[]
  isLoading: boolean
  error: string | null
}

export function useMandateData({
  documentSymbol,
}: UseMandateDataParams): MandateDataResponse {
  const [mandate, setMandate] = useState<Mandate | null>(null)
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMandateData = async () => {
      if (!documentSymbol) return

      try {
        setIsLoading(true)
        setError(null)

        // Use the new unified API endpoint
        const encodedSymbol = documentSymbol
          .split('/')
          .map((segment) => encodeURIComponent(segment))
          .join('/')
        const response = await fetch(`/api/mandate/${encodedSymbol}`)

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Mandate not found')
          }
          throw new Error('Failed to fetch mandate data')
        }

        const data = await response.json()

        setMandate(data.mandate)
        setParagraphs(data.paragraphs || [])
        setEntities(data.reference?.entities || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMandateData()
  }, [documentSymbol])

  return {
    mandate,
    paragraphs,
    entities,
    isLoading,
    error,
  }
}
