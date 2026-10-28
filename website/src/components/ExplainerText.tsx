import Link from 'next/link'

import { explainerTexts } from '@/lib/en_text_contents'

const text = explainerTexts.mainHeader

export function ExplainerText() {
  return (
    <div className="space-y-3 text-left text-foreground">
      <p className="text-base leading-relaxed whitespace-pre-line md:text-lg">
        {text.shortDescription}{' '}
        <Link href="/about" className="text-un-blue-text hover:underline">
          {text.learnMore}
        </Link>
        .
      </p>
    </div>
  )
}
