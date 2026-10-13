import { ExternalLink, type LucideIcon } from 'lucide-react'

interface ResourceLinkProps {
  title: string
  description: string
  href: string
  icon?: LucideIcon
}

export function ResourceLink({
  title,
  description,
  href,
  icon: Icon,
}: ResourceLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-lg border border-border bg-white p-6 transition-all hover:border-un-blue hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-5 w-5 text-un-blue-text" />}
          <h3 className="font-medium text-foreground group-hover:text-un-blue-text">
            {title}
          </h3>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-un-blue-text" />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </a>
  )
}
