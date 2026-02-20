'use client'

import { explainerTexts } from '@/lib/en_text_contents'
import { Button } from '@/components/ui/button'
import { FileText, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function MethodologyPage() {
  const router = useRouter()
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <FileText className="h-8 w-8 text-un-blue" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Methodology
        </h1>
      </div>
      <div className="mb-4 max-w-[780px] space-y-4 text-left text-muted-foreground sm:text-justify">
        {explainerTexts.mainHeader.fullDescription.map((paragraph, index) => (
          <p key={index} className="leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
      <img src="/images/methodology.svg" alt="Methodology" className="w-full" />
      <hr className="my-8 border-muted" />
      <div className="max-w-[780px] text-left">
        <p className="text-sm leading-relaxed text-muted-foreground italic sm:text-justify">
          {explainerTexts.mainHeader.disclaimer}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-6 mb-20 inline-flex h-auto shrink-0 items-center gap-1 bg-trout! px-2 py-1 text-xs text-white! transition-colors hover:bg-trout/90! sm:gap-2 sm:px-2.5 sm:py-1.5 sm:text-sm"
          onClick={() => router.push('/resources' as never)}
        >
          More Resources
          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </div>
  )
}
