import { Link as LinkIcon } from 'lucide-react'

interface SectionHeaderProps {
  title: string
  description: string
  id?: string
}

/**
 * Compact, image-free section header. A lighter-weight replacement for
 * {@link SectionBanner} used on the secretariat page: a title and a short
 * description bounded by the same content column as the section it introduces,
 * with a hover anchor link when an `id` is given.
 */
export function SectionHeader({ title, description, id }: SectionHeaderProps) {
  return (
    <section
      id={id}
      className="mx-auto max-w-6xl scroll-mt-20 border-t border-border px-6 pt-8 md:px-12 lg:px-16"
    >
      <h2 className="group mb-2 text-2xl font-bold tracking-tight text-foreground">
        {id ? (
          <a href={`#${id}`} className="hover:underline">
            {title}
            <LinkIcon className="ml-2 inline h-4 w-4 align-baseline text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
        ) : (
          title
        )}
      </h2>
      <p className="max-w-3xl text-sm leading-relaxed text-foreground">
        {description}
      </p>
    </section>
  )
}
