'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import { useSearchParams } from 'next/navigation'

import { directoryRequestUrl, directoryResource } from '@/lib/directory-request'
import type { DirectoryPanel, DirectoryResource } from '@/lib/directory-request'

import type { DirectoryData } from './types'

interface DirectoryState {
  data: DirectoryData
  error: string | null
  errorResource: DirectoryResource | null
  loaded: DirectoryResource[]
  loading: DirectoryResource | null
  searchKey: string | null
}

const initialState: DirectoryState = {
  data: {},
  error: null,
  errorResource: null,
  loaded: [],
  loading: null,
  searchKey: null,
}

const isPanelData = (
  value: unknown,
  resource: DirectoryResource
): value is DirectoryData => {
  if (!value || typeof value !== 'object') return false
  const data = value as DirectoryData
  if (resource === 'organs') return Array.isArray(data.organGroups)
  if (resource === 'budget') return Array.isArray(data.budgetStreams)
  return (
    Array.isArray(data.subjectDomains) &&
    !!data.documentTypes &&
    typeof data.documentTypes === 'object'
  )
}

const fetchPanel = async (search: string, panel: DirectoryPanel) => {
  const response = await fetch(directoryRequestUrl(search, panel))
  if (!response.ok)
    throw new Error(`Directory request failed: ${response.status}`)
  const value: unknown = await response.json()
  if (!isPanelData(value, directoryResource(panel)))
    throw new Error('Invalid directory response')
  return value
}

const forSearch = (state: DirectoryState, search: string): DirectoryState =>
  state.searchKey === search ? state : { ...initialState, searchKey: search }

const loadingState = (
  state: DirectoryState,
  search: string,
  resource: DirectoryResource
): DirectoryState => ({
  ...forSearch(state, search),
  error: null,
  errorResource: null,
  loading: resource,
})

interface ResultOptions {
  data?: DirectoryData
  error?: string
  resource: DirectoryResource
  search: string
}

const resultState = (
  state: DirectoryState,
  options: ResultOptions
): DirectoryState => {
  const current = forSearch(state, options.search)
  return {
    ...current,
    data: { ...current.data, ...options.data },
    error: options.error ?? null,
    errorResource: options.error ? options.resource : null,
    loaded: options.error
      ? current.loaded
      : [...new Set([...current.loaded, options.resource])],
    loading: null,
  }
}

interface RequestOptions {
  panel: DirectoryPanel
  request: number
  search: string
  sequence: RefObject<number>
  setState: Dispatch<SetStateAction<DirectoryState>>
}

const performRequest = async (options: RequestOptions) => {
  const resource = directoryResource(options.panel)
  try {
    const data = await fetchPanel(options.search, options.panel)
    if (options.request !== options.sequence.current) return
    options.setState((state) =>
      resultState(state, { data, resource, search: options.search })
    )
  } catch (error) {
    if (options.request !== options.sequence.current) return
    const message = error instanceof Error ? error.message : String(error)
    options.setState((state) =>
      resultState(state, { error: message, resource, search: options.search })
    )
  }
}

interface StartOptions {
  current: DirectoryState
  panel: DirectoryPanel
  search: string
  sequence: RefObject<number>
  setCurrent: Dispatch<SetStateAction<DirectoryState>>
}

const startRequest = (options: StartOptions) => {
  const resource = directoryResource(options.panel)
  if (
    options.current.searchKey === options.search &&
    (options.current.loading === resource ||
      options.current.loaded.includes(resource))
  )
    return
  const request = ++options.sequence.current
  options.setCurrent((value) => loadingState(value, options.search, resource))
  return performRequest({ ...options, request, setState: options.setCurrent })
}

const usePanelLoader = (search: string) => {
  const [current, setCurrent] = useState(initialState)
  const sequence = useRef(0)
  const load = useCallback(
    (panel: DirectoryPanel) =>
      startRequest({ current, panel, search, sequence, setCurrent }),
    [current, search]
  )
  return { current, load }
}

/** Fetches and reuses only the resource required by the active panel. */
export const useDirectoryData = (panel: DirectoryPanel | null) => {
  const search = useSearchParams().toString()
  const { current, load } = usePanelLoader(search)
  const resource = panel ? directoryResource(panel) : null
  useEffect(() => {
    if (panel && current.searchKey !== null && current.searchKey !== search)
      void load(panel)
  }, [current.searchKey, load, panel, search])
  const visible = current.searchKey === search
  return {
    data: visible ? current.data : {},
    error: visible && current.errorResource === resource ? current.error : null,
    loading: visible && current.loading === resource,
    load,
  }
}
