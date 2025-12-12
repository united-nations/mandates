'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Button as DiffButton,
  Comparison,
  type DiffData,
} from '@/components/DiffViewer'
import { FileText, ArrowLeftRight } from 'lucide-react'

function extractYear(symbol: string): string {
  // Extract year from UN document symbols like A/RES/77/16 -> 2022 (77th session = 2022)
  const match = symbol.match(/\/(\d{2,4})\//)
  if (match) {
    const sessionOrYear = parseInt(match[1])
    // If it's a 2-digit session number, convert to year (session 77 = 2022, etc.)
    if (sessionOrYear < 100) {
      return (1945 + sessionOrYear).toString()
    }
    // If it's already a 4-digit year, return as is
    return sessionOrYear.toString()
  }
  return 'Unknown'
}

export default function DiffPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [symbol1, setSymbol1] = useState(
    searchParams.get('symbol1') || 'A/RES/60/152'
  )
  const [symbol2, setSymbol2] = useState(
    searchParams.get('symbol2') || 'A/RES/61/156'
  )
  const [diffData, setDiffData] = useState<DiffData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [focus, setFocus] = useState<string | null>(null)
  const [documentTitles, setDocumentTitles] = useState<{
    [symbol: string]: string
  }>({})

  const fetchDocumentTitles = async (symbols: string[]) => {
    try {
      const response = await fetch('/api/fulltext')
      if (!response.ok) return

      const resolutions = await response.json()
      const titleMap: { [symbol: string]: string } = {}

      symbols.forEach((symbol) => {
        const resolution = resolutions.find(
          (r: { symbol: string; title?: string }) => r.symbol === symbol
        )
        if (resolution && resolution.title) {
          titleMap[symbol] = resolution.title
        }
      })

      setDocumentTitles((prev) => ({ ...prev, ...titleMap }))
    } catch (err) {
      console.error('Failed to fetch document titles:', err)
    }
  }

  const fetchDiff = async (sym1?: string, sym2?: string) => {
    const symbolA = sym1 || symbol1
    const symbolB = sym2 || symbol2

    if (!symbolA.trim() || !symbolB.trim()) {
      setError('Both document symbols are required')
      return
    }

    setLoading(true)
    setError(null)
    setDiffData(null)

    try {
      const response = await fetch('/api/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbolA: symbolA.trim(),
          symbolB: symbolB.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch diff')
      }

      const data = await response.json()
      setDiffData(data)

      // Fetch titles for both documents
      await fetchDocumentTitles([symbolA, symbolB])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const updateUrl = (sym1?: string, sym2?: string) => {
    const symbolA = sym1 || symbol1
    const symbolB = sym2 || symbol2
    const params = new URLSearchParams()
    if (symbolA.trim()) params.set('symbol1', symbolA.trim())
    if (symbolB.trim()) params.set('symbol2', symbolB.trim())
    router.push(`/diff?${params.toString()}`)
  }

  useEffect(() => {
    const symbol1Param = searchParams.get('symbol1')
    const symbol2Param = searchParams.get('symbol2')

    if (symbol1Param && symbol2Param) {
      fetchDiff(symbol1Param, symbol2Param)
    }
  }, [searchParams])

  // Check if we have query parameters
  const hasQueryParams =
    searchParams.get('symbol1') || searchParams.get('symbol2')

  // Example comparisons data
  const exampleComparisons = [
    {
      symbol1: 'A/RES/60/152',
      year1: '2005',
      symbol2: 'A/RES/61/156',
      year2: '2006',
    },
    {
      symbol1: 'A/RES/78/14',
      year1: '2023',
      symbol2: 'A/RES/79/15',
      year2: '2024',
    },
    {
      symbol1: 'A/RES/77/157',
      year1: '2022',
      symbol2: 'A/RES/78/143',
      year2: '2023',
    },
    {
      symbol1: 'A/RES/62/22',
      year1: '2007',
      symbol2: 'A/RES/63/66',
      year2: '2008',
    },
    {
      symbol1: 'A/RES/77/187',
      year1: '2022',
      symbol2: 'A/RES/78/170',
      year2: '2023',
    },
    {
      symbol1: 'A/RES/57/217',
      year1: '2002',
      symbol2: 'A/RES/58/188',
      year2: '2003',
    },
  ]

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="space-y-4">
        {/* Title Section */}
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <ArrowLeftRight className="h-6 w-6 text-un-blue" />
          {hasQueryParams ? (
            <button
              onClick={() => router.push('/diff')}
              className="cursor-pointer transition-colors hover:text-un-blue"
              title="Return to start page"
            >
              Document Comparison
            </button>
          ) : (
            <span>Document Comparison</span>
          )}
        </h1>

        {!hasQueryParams && (
          <div className="space-y-6">
            {/* Input Section */}
            <div className="rounded-lg bg-muted/30 p-6">
              <h2 className="mb-4 text-lg font-semibold">Compare Documents</h2>
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Document Symbol 1
                  </label>
                  <input
                    type="text"
                    value={symbol1}
                    onChange={(e) => setSymbol1(e.target.value)}
                    placeholder="e.g., A/RES/77/16"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-un-blue focus:ring-1 focus:ring-un-blue focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Document Symbol 2
                  </label>
                  <input
                    type="text"
                    value={symbol2}
                    onChange={(e) => setSymbol2(e.target.value)}
                    placeholder="e.g., A/RES/79/326"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-un-blue focus:ring-1 focus:ring-un-blue focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  updateUrl()
                  fetchDiff()
                }}
                disabled={loading || !symbol1.trim() || !symbol2.trim()}
                className="flex items-center gap-2 rounded-md bg-un-blue px-4 py-2 text-white transition-colors hover:bg-un-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileText className="h-4 w-4" />
                {loading ? 'Loading...' : 'Compare Documents'}
              </button>
            </div>

            {/* Example Comparisons */}
            <div className="rounded-lg border bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold">
                Example Comparisons
              </h2>
              <p className="mb-4 text-sm text-gray-600">
                Click on any comparison below to see how documents have evolved
                over time:
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {exampleComparisons.map((example, index) => (
                  <a
                    key={index}
                    href={`/diff?symbol1=${encodeURIComponent(example.symbol1)}&symbol2=${encodeURIComponent(example.symbol2)}`}
                    className="group block rounded-lg border border-gray-200 p-3 transition-colors hover:border-un-blue hover:bg-blue-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-mono text-un-blue group-hover:text-un-blue/80">
                          {example.symbol1} ({example.year1})
                        </span>
                        <span className="text-gray-500">vs</span>
                        <span className="font-mono text-un-blue group-hover:text-un-blue/80">
                          {example.symbol2} ({example.year2})
                        </span>
                      </div>
                      <ArrowLeftRight className="h-4 w-4 shrink-0 text-gray-400 group-hover:text-un-blue" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {hasQueryParams && diffData && (
          <div className="space-y-4">
            <div className="mb-6 flex flex-col items-center gap-4">
              <DiffButton focus={focus} setFocus={setFocus} />
              {/* <div className="text-sm text-muted-foreground">
                <span className="font-medium text-un-blue">{(diffData.score * 100).toFixed(1)}%</span> similarity
              </div> */}
              {/* hide because it's currently not consistent with the similarity scores in the overview */}
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="text-center">
                <h3 className="text-base font-semibold text-foreground">
                  {symbol1}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  ({extractYear(symbol1)})
                </p>
                {documentTitles[symbol1] && (
                  <p className="mt-2 text-xs leading-tight text-gray-600">
                    {documentTitles[symbol1]}
                  </p>
                )}
              </div>
              <div className="text-center">
                <h3 className="text-base font-semibold text-foreground">
                  {symbol2}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  ({extractYear(symbol2)})
                </p>
                {documentTitles[symbol2] && (
                  <p className="mt-2 text-xs leading-tight text-gray-600">
                    {documentTitles[symbol2]}
                  </p>
                )}
              </div>
            </div>

            {loading ? (
              <div className="py-8 text-center">
                <div className="inline-flex items-center gap-2 text-gray-600">
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-un-blue"></div>
                  Loading comparison...
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {diffData.diff.map((item, index) => (
                  <Comparison key={index} item={item} focus={focus} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
