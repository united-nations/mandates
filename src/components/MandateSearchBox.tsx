'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'

export function MandateSearchBox() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '')

  const handleSearch = (searchTerm: string = keyword) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')
    if (searchTerm.trim()) {
      params.set('keyword', searchTerm.trim())
    } else {
      params.delete('keyword')
      // When clearing search, if sort was relevance, reset to default (citing entities)
      if (params.get('sort_by') === 'default') {
        params.set('sort_by', 'citing_entities_desc')
      }
    }
    router.push(`${pathname}?${params.toString()}` as never, { scroll: false })
  }

  const handleClear = () => {
    setKeyword('')
    handleSearch('')
  }

  return (
    <div className="relative">
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
      <Input
        placeholder="Search mandate documents..."
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleSearch(keyword)
          }
        }}
        className="h-11 pr-20 pl-10"
      />
      <div className="absolute top-0 right-0 flex h-full">
        {keyword && (
          <Button
            variant="ghost"
            size="sm"
            className="h-full px-2"
            onClick={handleClear}
            title="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-full px-3 text-muted-foreground hover:text-foreground"
          onClick={() => handleSearch(keyword)}
          title="Search (or press Enter)"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
