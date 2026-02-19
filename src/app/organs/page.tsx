import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Building2, ExternalLink, Mail } from 'lucide-react'
import contactsData from '../../../public/data/organ_contacts.json'

interface OrganContact {
  entity: string | null
  entity_long: string | null
  governing_bodies: string
  intergov_bodies_link: string
  secretariats: string
  order: string | null
}

/**
 * Parse a markdown bullet-list field into an array of trimmed items.
 * Strips leading `- ` bullets and blank lines.
 */
function parseBulletList(raw: string): string[] {
  if (!raw) return []
  return raw
    .split('\n')
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)
}

/**
 * Parse a markdown-style rich text field into an array of link/text segments.
 * Handles patterns like:
 *   - <https://example.com>
 *   - [label](url)
 *   - mailto: links
 *   - plain email addresses
 *   - plain text
 */
function parseRichText(raw: string): React.ReactNode[] {
  if (
    !raw ||
    raw.trim() === '-' ||
    raw.toLowerCase().trim() === 'to be updated'
  )
    return []

  // Split into lines (each line is typically a bullet)
  const lines = raw
    .split('\n')
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)

  return lines.map((line, i) => {
    const nodes: React.ReactNode[] = []
    const remaining = line

    // Pattern to match markdown links [text](url) and angle-bracket links <url>
    const linkPattern =
      /\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)]+)\)|<((?:https?:\/\/|mailto:)[^>]+)>/g
    let match: RegExpExecArray | null
    let lastIndex = 0

    while ((match = linkPattern.exec(remaining)) !== null) {
      // Add any text before this match
      if (match.index > lastIndex) {
        const before = remaining
          .slice(lastIndex, match.index)
          .replace(/^:\s*/, '')
          .trim()
        if (before)
          nodes.push(<span key={`t-${i}-${lastIndex}`}>{before} </span>)
      }

      const label = match[1] || match[3] || ''
      const rawUrl = match[2] || match[3] || ''
      // Detect email: explicit mailto:, @ in label, or http(s) URL that's actually an email
      const looksLikeEmail =
        rawUrl.startsWith('mailto:') ||
        label.includes('@') ||
        /^https?:\/\/[^/]+@/.test(rawUrl)
      const url = looksLikeEmail
        ? rawUrl.replace(/^https?:\/\//, '').replace(/^mailto:/, '')
        : rawUrl
      const href = looksLikeEmail ? `mailto:${url}` : rawUrl
      const displayLabel = looksLikeEmail
        ? label.includes('@')
          ? label
          : url
        : label
            .replace(/^https?:\/\//, '')
            .replace(/^www\d*\./, '')
            .replace(/\/$/, '')

      nodes.push(
        <a
          key={`l-${i}-${match.index}`}
          href={href}
          target={looksLikeEmail ? undefined : '_blank'}
          rel={looksLikeEmail ? undefined : 'noopener noreferrer'}
          className="text-un-blue underline decoration-un-blue/30 underline-offset-2 transition-colors hover:text-un-blue/80 hover:decoration-un-blue"
        >
          {displayLabel}
          {looksLikeEmail ? (
            <Mail className="mb-0.5 ml-0.5 inline h-3 w-3" />
          ) : (
            <ExternalLink className="mb-0.5 ml-0.5 inline h-3 w-3" />
          )}
        </a>
      )

      lastIndex = match.index + match[0].length
    }

    // Remaining text after last match
    if (lastIndex < remaining.length) {
      const tail = remaining.slice(lastIndex).replace(/^:\s*/, '').trim()
      if (tail) {
        // Check for bare email addresses
        const emailMatch = tail.match(
          /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
        )
        if (emailMatch) {
          const before = tail.slice(0, emailMatch.index).trim()
          const after = tail
            .slice((emailMatch.index ?? 0) + emailMatch[0].length)
            .trim()
          if (before) nodes.push(<span key={`bt-${i}`}>{before} </span>)
          nodes.push(
            <a
              key={`em-${i}`}
              href={`mailto:${emailMatch[1]}`}
              className="text-un-blue underline decoration-un-blue/30 underline-offset-2 transition-colors hover:text-un-blue/80 hover:decoration-un-blue"
            >
              {emailMatch[1]}
              <Mail className="mb-0.5 ml-0.5 inline h-3 w-3" />
            </a>
          )
          if (after) nodes.push(<span key={`at-${i}`}> {after}</span>)
        } else {
          nodes.push(<span key={`r-${i}`}>{tail}</span>)
        }
      }
    }

    if (nodes.length === 0) return null

    return <li key={i}>{nodes}</li>
  })
}

export default function OrgansPage() {
  const allContacts = contactsData as OrganContact[]

  // Split into entity-based orgs and standalone UN bodies
  const entityContacts = allContacts
    .filter((c) => c.entity)
    .sort((a, b) => a.entity!.localeCompare(b.entity!))

  const unBodies = allContacts
    .filter((c) => !c.entity)
    .sort((a, b) => {
      // Items with order come first, sorted by order ascending
      const orderA = a.order ? parseInt(a.order, 10) : Infinity
      const orderB = b.order ? parseInt(b.order, 10) : Infinity
      if (orderA !== orderB) return orderA - orderB
      // Then alphabetically by body name
      const nameA = a.governing_bodies.replace(/^[-\s]+/, '').trim()
      const nameB = b.governing_bodies.replace(/^[-\s]+/, '').trim()
      return nameA.localeCompare(nameB)
    })

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex items-center gap-3">
        <Building2 className="h-8 w-8 text-un-blue" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Intergovernmental Organs &amp; Bodies
          </h1>
          {/* <p className="mt-0.5 text-sm text-muted-foreground">
            Directory of governing bodies across the UN system with links to
            their pages and secretariat contacts.
          </p> */}
          <p className="mt-0.5 max-w-[55%] text-sm text-muted-foreground">
            For informational purposes only. The relevant rules of the
            organization concerned should be consulted in order to establish the
            legal status, functions and reporting lines of each entity listed.
          </p>
        </div>
      </div>

      {/* Principal & Subsidiary UN Bodies */}
      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        <Table className="w-full table-fixed break-words">
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-[40%] font-semibold text-foreground">
                Principal UN Organs
              </TableHead>
              <TableHead className="w-[30%] font-semibold text-foreground">
                Official Page
              </TableHead>
              <TableHead className="w-[30%] font-semibold text-foreground">
                Secretariat Contact
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unBodies.map((contact, idx) => {
              const links = parseRichText(contact.intergov_bodies_link)
              const secretariat = parseRichText(contact.secretariats)
              const hasSecretariat = secretariat.filter(Boolean).length > 0

              return (
                <TableRow key={idx}>
                  <TableCell className="align-top font-semibold text-foreground">
                    {contact.governing_bodies.replace(/^[-\s]+/, '').trim()}
                  </TableCell>
                  <TableCell className="align-top text-sm">
                    {links.filter(Boolean).length > 0 ? (
                      <ul className="list-disc space-y-0.5 pl-4 marker:text-un-blue">
                        {links}
                      </ul>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        —
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-sm">
                    {hasSecretariat ? (
                      <ul className="list-disc space-y-0.5 pl-4 marker:text-un-blue">
                        {secretariat}
                      </ul>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        To be updated
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <p className="mb-10 text-xs text-muted-foreground"></p>

      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        <Table className="w-full table-fixed break-words">
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead
                colSpan={2}
                className="w-[40%] font-semibold text-foreground"
              >
                Intergovernmental Organs & Bodies
                <br />
                of Specialized Agencies
              </TableHead>
              <TableHead className="w-[30%] font-semibold text-foreground">
                Official Pages
              </TableHead>
              <TableHead className="w-[30%] font-semibold text-foreground">
                Secretariat Contacts
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entityContacts.map((contact, idx) => {
              const links = parseRichText(contact.intergov_bodies_link)
              const secretariat = parseRichText(contact.secretariats)
              const hasSecretariat = secretariat.filter(Boolean).length > 0

              return (
                <TableRow key={idx}>
                  <TableCell className="align-top">
                    <div>
                      <div className="font-semibold text-foreground">
                        {contact.entity}
                      </div>
                      {contact.entity_long && (
                        <div className="text-xs text-muted-foreground">
                          {contact.entity_long}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="align-top text-sm text-foreground">
                    <ul className="list-disc space-y-0.5 pl-4 marker:text-un-blue">
                      {parseBulletList(contact.governing_bodies).map(
                        (item, i) => (
                          <li
                            key={i}
                            className="font-medium text-foreground/75"
                          >
                            {item}
                          </li>
                        )
                      )}
                    </ul>
                  </TableCell>
                  <TableCell className="align-top text-sm">
                    {links.filter(Boolean).length > 0 ? (
                      <ul className="list-disc space-y-0.5 pl-4 marker:text-un-blue">
                        {links}
                      </ul>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        —
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-sm">
                    {hasSecretariat ? (
                      <ul className="list-disc space-y-0.5 pl-4 marker:text-un-blue">
                        {secretariat}
                      </ul>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        To be updated
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {entityContacts.length} entities listed
      </p>
    </div>
  )
}
