import Image from 'next/image'
import Link from 'next/link'

import { ExpandableCard } from '@/components/ExpandableCard'
import { QuoteBlock } from '@/components/QuoteBlock'
import { explainerTexts } from '@/lib/en_text_contents'

/**
 * The closing matter: the methodology expander and the Secretary-General
 * quote.
 *
 * `dev` moved the methodology to its own /methodology page and dropped the
 * quote. Both are kept here, and the expander links on to /methodology so the
 * two do not drift into being separate accounts of the same thing.
 */
export function SecretariatBackground() {
  return (
    <>
      <section className="bg-white py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-6 md:px-12 lg:px-16">
          <h2 className="mb-8 text-2xl font-bold text-gray-900">Background</h2>
          <div className="divide-y divide-gray-200">
            <ExpandableCard id="methodology" title="Methodology and Scope">
              <div className="space-y-4">
                {explainerTexts.mainHeader.fullDescription.map(
                  (paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  )
                )}
                <Image
                  src="/images/methodology.svg"
                  alt="How mandate source documents are identified"
                  width={248}
                  height={135}
                  unoptimized
                  className="h-auto w-3/4"
                />
                <p>
                  Section&nbsp;1 (Overall policymaking, direction and
                  coordination) citations in the 2027 proposed programme budget
                  are preliminary, drawn from the advance version of
                  A/81/6&nbsp;(Sect.&nbsp;1), and may change in the final
                  budget.
                </p>
                <p className="text-gray-500 italic">
                  {explainerTexts.mainHeader.disclaimer}
                </p>
                <p>
                  <Link
                    href="/methodology"
                    className="text-sm font-medium text-un-blue hover:underline"
                  >
                    Read the full methodology →
                  </Link>
                </p>
              </div>
            </ExpandableCard>
          </div>
        </div>
      </section>

      <QuoteBlock
        lines={[
          'Mandates are critical to everything we do.',
          'They define our work. They shape our structures.',
          'They are the basis for how we are held accountable.',
        ]}
        attribution="António Guterres, UN Secretary-General"
        imageSrc="/images/banners/guterres.png"
        imageAlt="UN Secretary-General António Guterres"
      />
    </>
  )
}
