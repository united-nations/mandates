'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { FocusToggle, Comparison, type DiffData } from '@/components/diff-viewer'
import { Input } from '@/components/ui/input'
import { FileText, ArrowLeftRight, Edit3, Check, X } from 'lucide-react'

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
  
  const [symbol1, setSymbol1] = useState(searchParams.get('symbol1') || 'A/RES/77/16')
  const [symbol2, setSymbol2] = useState(searchParams.get('symbol2') || 'A/RES/79/326')
  const [diffData, setDiffData] = useState<DiffData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [focus, setFocus] = useState<string | null>(null)
  const [editingSymbol, setEditingSymbol] = useState<'symbol1' | 'symbol2' | null>(null)
  const [tempSymbol, setTempSymbol] = useState('')

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
        body: JSON.stringify({ symbolA: symbolA.trim(), symbolB: symbolB.trim() })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch diff')
      }

      const data = await response.json()
      setDiffData(data)
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

  const startEditing = (symbolType: 'symbol1' | 'symbol2') => {
    setEditingSymbol(symbolType)
    setTempSymbol(symbolType === 'symbol1' ? symbol1 : symbol2)
  }

  const cancelEditing = () => {
    setEditingSymbol(null)
    setTempSymbol('')
  }

  const saveSymbol = () => {
    if (!editingSymbol || !tempSymbol.trim()) return
    
    const newSymbol1 = editingSymbol === 'symbol1' ? tempSymbol.trim() : symbol1
    const newSymbol2 = editingSymbol === 'symbol2' ? tempSymbol.trim() : symbol2
    
    if (editingSymbol === 'symbol1') {
      setSymbol1(newSymbol1)
    } else {
      setSymbol2(newSymbol2)
    }
    
    setEditingSymbol(null)
    setTempSymbol('')
    
    // Auto-fetch if both symbols are valid
    if (newSymbol1.trim() && newSymbol2.trim()) {
      updateUrl(newSymbol1, newSymbol2)
      fetchDiff(newSymbol1, newSymbol2)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveSymbol()
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  useEffect(() => {
    const symbol1Param = searchParams.get('symbol1')
    const symbol2Param = searchParams.get('symbol2')
    
    if (symbol1Param && symbol2Param) {
      fetchDiff(symbol1Param, symbol2Param)
    }
  }, [searchParams])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-4">
        {/* Title Section */}
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <ArrowLeftRight className="h-6 w-6 text-un-blue" />
          Document Comparison
        </h1>
        

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {diffData && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <div className="text-sm text-gray-600">
                Similarity Score: <span className="font-medium text-un-blue">{(diffData.score * 100).toFixed(1)}%</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Left Header */}
              <div className="text-center">
                {editingSymbol === 'symbol1' ? (
                  <div className="flex items-center justify-center gap-2">
                    <Input
                      value={tempSymbol}
                      onChange={(e) => setTempSymbol(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="e.g., A/RES/77/16"
                      className="text-center text-base font-semibold border-un-blue focus:border-un-blue focus:ring-un-blue"
                      autoFocus
                    />
                    <button
                      onClick={saveSymbol}
                      className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => startEditing('symbol1')}
                      className="text-base font-semibold text-gray-900 hover:text-un-blue transition-colors cursor-pointer flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100"
                      title="Click to edit"
                    >
                      {symbol1} ({extractYear(symbol1)})
                      <div className="flex items-center gap-1 ml-1">
                        <Edit3 className="h-3 w-3 opacity-50" />
                        <FocusToggle position="left" focus={focus} setFocus={setFocus} />
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Right Header */}
              <div className="text-center">
                {editingSymbol === 'symbol2' ? (
                  <div className="flex items-center justify-center gap-2">
                    <Input
                      value={tempSymbol}
                      onChange={(e) => setTempSymbol(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="e.g., A/RES/79/326"
                      className="text-center text-base font-semibold border-un-blue focus:border-un-blue focus:ring-un-blue"
                      autoFocus
                    />
                    <button
                      onClick={saveSymbol}
                      className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => startEditing('symbol2')}
                      className="text-base font-semibold text-gray-900 hover:text-un-blue transition-colors cursor-pointer flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100"
                      title="Click to edit"
                    >
                      {symbol2} ({extractYear(symbol2)})
                      <div className="flex items-center gap-1 ml-1">
                        <Edit3 className="h-3 w-3 opacity-50" />
                        <FocusToggle position="right" focus={focus} setFocus={setFocus} />
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2 text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-un-blue"></div>
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
