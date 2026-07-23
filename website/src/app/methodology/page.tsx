import type { Metadata } from 'next'
import Image from 'next/image'

import { explainerTexts } from '@/lib/en_text_contents'

export const metadata: Metadata = {
  title: 'Methodology and Scope',
  description: explainerTexts.mainHeader.shortDescriptionPlain,
}

export default function MethodologyPage() {
  return (
    <article className="text-base leading-relaxed text-gray-900">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-gray-900">
        Methodology and Scope
      </h1>

      <div className="space-y-4">
        {explainerTexts.mainHeader.fullDescription.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}

        <Image
          src="/images/methodology.svg"
          alt="How mandate source documents are identified"
          width={248}
          height={135}
          unoptimized
          className="h-auto w-3/4 max-w-md"
        />

        <p>
          Some citations in the 2027 proposed programme budget are preliminary,
          drawn from advance versions of the underlying documents, and may change
          in the final budget: Section&nbsp;1 (Overall policymaking, direction
          and coordination), from A/81/6&nbsp;(Sect.&nbsp;1); and the special
          political missions, from A/81/6&nbsp;(Sect.&nbsp;3)/Add.1–4.
        </p>

        <p className="text-gray-600 italic">
          {explainerTexts.mainHeader.disclaimer}
        </p>
      </div>
    </article>
  )
}
