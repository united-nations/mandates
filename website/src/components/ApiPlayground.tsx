'use client'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'

export function ApiPlayground() {
  const [endpoint, setEndpoint] = useState('search')
  const [query, setQuery] = useState('keyword=climate&limit=2')
  const [symbol, setSymbol] = useState('A/RES/79/1')
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  const path =
    endpoint === 'document'
      ? `/api/v1/documents/${encodeURIComponent(symbol)}`
      : endpoint === 'reference'
        ? '/api/v1/reference'
        : '/api/v1/documents'
  const url = query ? `${path}?${new URLSearchParams(query)}` : path
  async function run() {
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    setBusy(true)
    try {
      const response = await fetch(url, { signal: request.signal })
      const body: unknown = await response.json()
      setResult(
        `${response.status} ${response.statusText}\n${JSON.stringify(body, null, 2)}`
      )
    } catch (error) {
      if (!request.signal.aborted)
        setResult(error instanceof Error ? error.message : 'Request failed')
    } finally {
      if (!request.signal.aborted) setBusy(false)
    }
  }
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <label className="block text-sm font-medium">
        Endpoint
        <select
          className="mt-1 block w-full rounded-md border bg-background p-2"
          value={endpoint}
          onChange={(event) => setEndpoint(event.target.value)}
        >
          <option value="search">Search documents</option>
          <option value="document">Read a document</option>
          <option value="reference">Reference data</option>
        </select>
      </label>
      {endpoint === 'document' && (
        <label className="block text-sm font-medium">
          Document symbol
          <input
            className="mt-1 block w-full rounded-md border p-2"
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
          />
        </label>
      )}
      <label className="block text-sm font-medium">
        Query parameters
        <input
          className="mt-1 block w-full rounded-md border p-2 font-mono"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <code className="block text-sm break-all">GET {url}</code>
      <Button onClick={run} disabled={busy}>
        {busy ? 'Loading…' : 'Send request'}
      </Button>
      <div role="status" aria-live="polite" className="sr-only">
        {busy ? 'Request in progress' : result ? 'Response ready' : ''}
      </div>
      {result && (
        <pre
          tabIndex={0}
          aria-label="API response"
          className="max-h-96 overflow-auto rounded bg-muted p-3 text-xs"
        >
          {result}
        </pre>
      )}
    </div>
  )
}
