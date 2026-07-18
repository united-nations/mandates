'use client'

import { Link as LinkIcon } from 'lucide-react'
import Image from 'next/image'

interface SectionBannerProps {
  imageSrc: string
  title: string
  description: string
  id?: string
}

export function SectionBanner({
  imageSrc,
  title,
  description,
  id,
}: SectionBannerProps) {
  return (
    <section id={id} className="relative w-full scroll-mt-20">
      {/* Mobile: stacked layout */}
      <div className="md:hidden">
        <div className="relative aspect-[3/1] w-full overflow-hidden bg-gray-100">
          <Image
            src={imageSrc}
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-right"
            priority
          />
        </div>
        <div className="bg-gray-50 px-6 py-6">
          <h2 className="group mb-2 text-xl font-bold text-gray-900">
            {id ? (
              <a href={`#${id}`} className="hover:underline">
                {title}
                <LinkIcon className="ml-2 inline h-4 w-4 align-baseline text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            ) : (
              title
            )}
          </h2>
          <p className="text-sm leading-relaxed text-gray-700">{description}</p>
        </div>
      </div>

      {/* Desktop: overlay layout - dark text over the light left half of the image */}
      <div className="hidden w-full md:block">
        <div className="mx-auto max-w-[1440px]">
          <div className="relative aspect-[18/5] w-full overflow-hidden bg-gray-100">
            <Image
              src={imageSrc}
              alt=""
              fill
              sizes="(min-width: 1440px) 1440px, 100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 flex items-center">
              <div className="mx-auto w-full max-w-6xl px-12 lg:px-16">
                <div className="max-w-[50%]">
                  <h2 className="group mb-3 text-2xl font-bold text-gray-900 lg:text-3xl">
                    {id ? (
                      <a href={`#${id}`} className="hover:underline">
                        {title}
                        <LinkIcon className="ml-2 inline h-5 w-5 align-baseline text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
                      </a>
                    ) : (
                      title
                    )}
                  </h2>
                  <p className="text-sm leading-relaxed text-gray-700 lg:text-base">
                    {description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
