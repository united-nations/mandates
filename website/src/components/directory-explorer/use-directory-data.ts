'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import { useSearchParams } from 'next/navigation'

import {
  directoryRequestUrl,
  directoryResource,
  directoryScopeKey,
} from '@/lib/directory-request'
import type { DirectoryPanel, DirectoryResource } from '@/lib/directory-request'

import type { DirectoryData } from './types'

/** A resource together with the scope key it is being read at. */
interface Read {
  key: string
  resource: DirectoryResource
}

interface DirectoryState {
  data: DirectoryData
  error: (Read & { message: string }) | null
  /** The scope key each slice of `data` was loaded under. */
  keys: Partial<Record<DirectoryResource, string>>
  loading: Read | null
}

const initialState: DirectoryState = {
  data: {},
  error: null,
  keys: {},
  loading: null,
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

const startedState = (state: DirectoryState, read: Read): DirectoryState => ({
  ...state,
  error: null,
  loading: read,
})

const loadedState = (
  state: DirectoryState,
  read: Read,
  data: DirectoryData
): DirectoryState => ({
  data: { ...state.data, ...data },
  error: null,
  keys: { ...state.keys, [read.resource]: read.key },
  loading: null,
})

const failedState = (
  state: DirectoryState,
  read: Read,
  message: string
): DirectoryState => ({ ...state, error: { ...read, message }, loading: null })

interface RequestOptions {
  panel: DirectoryPanel
  read: Read
  request: number
  search: string
  sequence: RefObject<number>
  setState: Dispatch<SetStateAction<DirectoryState>>
}

const performRequest = async (options: RequestOptions) => {
  try {
    const data = await fetchPanel(options.search, options.panel)
    if (options.request !== options.sequence.current) return
    options.setState((state) => loadedState(state, options.read, data))
  } catch (error) {
    if (options.request !== options.sequence.current) return
    const message = error instanceof Error ? error.message : String(error)
    options.setState((state) => failedState(state, options.read, message))
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
  const read: Read = {
    key: directoryScopeKey(options.search, resource),
    resource,
  }
  const { loading, keys } = options.current
  if (keys[resource] === read.key) return
  if (loading?.resource === resource && loading.key === read.key) return
  const request = ++options.sequence.current
  options.setCurrent((state) => startedState(state, read))
  return performRequest({
    ...options,
    read,
    request,
    setState: options.setCurrent,
  })
}

/**
 * Fetches only the resource the open panel needs, and keeps what it last
 * loaded on screen while a new selection resolves.
 *
 * It used to hold one search key for all three resources and report an empty
 * payload the moment the URL moved off it. That gap was visible: a click on any
 * control in card 3 committed a new URL, this hook answered with no data for
 * one painted frame, the panel fell back to its one-line "no budget locations"
 * text, and the effect below then put a four-item skeleton in its place before
 * the tree returned. Three heights in three frames, in a dialog centred on the
 * viewport, which is the flicker - and it also unmounted the tree, so every
 * branch the reader had opened closed itself.
 *
 * Each resource now remembers the scope key it was loaded at. A key that no
 * longer matches makes the payload STALE, not absent: the caller keeps showing
 * it and says so, and it is replaced only when the new one has arrived.
 */
export const useDirectoryData = (panel: DirectoryPanel | null) => {
  const search = useSearchParams().toString()
  const [current, setCurrent] = useState(initialState)
  const sequence = useRef(0)
  const load = useCallback(
    (panel: DirectoryPanel) =>
      startRequest({ current, panel, search, sequence, setCurrent }),
    [current, search]
  )
  const resource = panel ? directoryResource(panel) : null
  const key = resource ? directoryScopeKey(search, resource) : null

  // Only a read the effect has not acted on starts a request, so a failed load
  // is reported once instead of retried on every render. Reopening the panel
  // calls load() directly and does retry.
  const requested = useRef<string | null>(null)
  const read = resource && key !== null ? `${resource}:${key}` : null
  useEffect(() => {
    if (!panel || read === null || requested.current === read) return
    requested.current = read
    void load(panel)
  }, [load, panel, read])

  const { error } = current
  return {
    data: current.data,
    /** Nothing has been loaded for this resource yet, at any scope. */
    empty: resource === null || current.keys[resource] === undefined,
    error:
      error && error.resource === resource && error.key === key
        ? error.message
        : null,
    load,
    /** What is on screen is not the answer to the filters now selected. */
    pending: resource !== null && current.keys[resource] !== key,
  }
}
