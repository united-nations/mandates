import Image from 'next/image'

interface QuoteBlockProps {
  /** The quote, one sentence per array entry — each renders on its own line. */
  lines: string[]
  attribution: string
  imageSrc?: string
  imageAlt?: string
}

export function QuoteBlock({
  lines,
  attribution,
  imageSrc,
  imageAlt = '',
}: QuoteBlockProps) {
  return (
    <section className="w-full bg-gray-50 py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-6 md:px-12 lg:px-16">
        <div className="flex flex-col items-center gap-8 md:flex-row md:gap-12">
          <div className="flex-1">
            <blockquote className="relative">
              <span className="absolute -left-4 -top-4 text-6xl text-un-blue opacity-20">
                &ldquo;
              </span>
              <p className="text-base leading-relaxed text-gray-700 md:text-lg lg:text-xl">
                {lines.map((line, i) => (
                  <span key={i} className="block">
                    {line}
                  </span>
                ))}
              </p>
              <footer className="mt-6">
                <cite className="not-italic text-gray-600">— {attribution}</cite>
              </footer>
            </blockquote>
          </div>
          {imageSrc && (
            <div className="w-full shrink-0 md:w-64 lg:w-80">
              <div className="relative aspect-[615/395] overflow-hidden rounded-lg">
                <Image
                  src={imageSrc}
                  alt={imageAlt}
                  fill
                  sizes="(min-width: 1024px) 320px, (min-width: 768px) 256px, 100vw"
                  className="object-contain"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
