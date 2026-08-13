import Link from 'next/link'

import { SectionBanner } from '@/components/SectionBanner'

/**
 * The shared frame for a /secretariat section: an image banner, then a content
 * column.
 *
 * WHY THIS FILE EXISTS AT ALL. The `unfck` branch keeps the rich, sectioned
 * page that `dev` minimised away. If that structure lived inline in
 * app/secretariat/page.tsx, every sync from `dev` would conflict across the
 * whole page. Instead the structure lives here, in files `dev` does not have,
 * so it can never conflict — page.tsx stays a thin composition file. Keep it
 * that way: new section content belongs in components/sections/, not in the
 * page.
 */

/** The content column, matched to the banner's own max width. */
export const SECTION_CONTENT = 'mx-auto max-w-6xl px-6 py-12 md:px-12 lg:px-16'

interface SecretariatSectionProps {
  /** Anchor id; the explore card and the section nav both scroll to it. */
  id: string
  imageSrc: string
  title: string
  description: string
  children: React.ReactNode
}

export function SecretariatSection({
  id,
  imageSrc,
  title,
  description,
  children,
}: SecretariatSectionProps) {
  return (
    <>
      <SectionBanner
        id={id}
        imageSrc={imageSrc}
        title={title}
        description={description}
      />
      <section className={SECTION_CONTENT}>{children}</section>
    </>
  )
}

/**
 * The expander stack under a section's directory. Sections carry between one
 * and four expanders, so the spacing is standardised here rather than
 * hand-tuned per section.
 */
export function SectionExpanders({ children }: { children: React.ReactNode }) {
  return <div className="mt-10 space-y-4">{children}</div>
}

/** A heading inside an expander that stacks several charts. */
export function ChartHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-sm font-semibold text-gray-900">{children}</h3>
  )
}

/** The source/caveat note at the foot of an expander. */
export function ChartNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-3xl text-xs leading-relaxed text-gray-500">
      {children}
    </p>
  )
}

/**
 * Link out of an expander to the lens's own page. Lives here, with the other
 * section primitives, rather than in whichever section happened to need it
 * first — several sections use it and a section should never import a
 * component from a sibling section.
 */
export function LensLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-un-blue hover:underline"
    >
      {children} <span aria-hidden>→</span>
    </Link>
  )
}
