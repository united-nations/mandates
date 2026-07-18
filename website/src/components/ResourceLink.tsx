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
      className="group block rounded-lg border border-gray-200 bg-white p-6 transition-all hover:border-un-blue hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-5 w-5 text-un-blue" />}
          <h3 className="font-medium text-gray-900 group-hover:text-un-blue">
            {title}
          </h3>
        </div>
        <ExternalLink className="h-4 w-4 text-gray-400 transition-colors group-hover:text-un-blue" />
      </div>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </a>
  )
}
