'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { directoryRequestUrl } from '@/lib/directory-request'

import type { DirectoryData } from './types'

interface DirectoryState {
  data: DirectoryData | null
  error: string | null
  key: string | null
  loading: boolean
}

const initialState: DirectoryState = {
  data: null,
  error: null,
  key: null,
  loading: false,
}

const isDirectoryData = (value: unknown): value is DirectoryData => {
  if (!value || typeof value !== 'object') return false
  const data = value as Partial<DirectoryData>
  return (
    Array.isArray(data.organGroups) &&
    Array.isArray(data.budgetStreams) &&
    Array.isArray(data.subjectDomains) &&
    typeof data.documentTypes === 'object'
  )
}

const fetchDirectories = async (search: string): Promise<DirectoryData> => {
  const response = await fetch(directoryRequestUrl(search))
  if (!response.ok)
    throw new Error(`Directory request failed: ${response.status}`)
  const value: unknown = await response.json()
  if (!isDirectoryData(value)) throw new Error('Invalid directory response')
  return value
}

/** Fetches directory payload once for the current URL filter state. */
export const useDirectoryData = (panelOpen: boolean) => {
  const search = useSearchParams().toString()
  const [state, setState] = useState(initialState)
  const requestSequence = useRef(0)
  const load = useCallback(async () => {
    if (state.key === search && (state.loading || state.data)) return
    const request = ++requestSequence.current
    setState({ data: null, error: null, key: search, loading: true })
    try {
      const data = await fetchDirectories(search)
      if (request !== requestSequence.current) return
      setState({ data, error: null, key: search, loading: false })
    } catch (error) {
      if (request !== requestSequence.current) return
      const message = error instanceof Error ? error.message : String(error)
      setState({ data: null, error: message, key: search, loading: false })
    }
  }, [search, state])
  useEffect(() => {
    // URL state is the source of truth. While a panel remains open, changing a
    // filter must invalidate its remote payload immediately.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starts an external fetch; the request guard prevents stale commits
    if (panelOpen && state.key !== null && state.key !== search) void load()
  }, [load, panelOpen, search, state.key])
  return { ...state, load }
}
