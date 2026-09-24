'use client'

import { X } from 'lucide-react'
import Link from 'next/link'
import { DetailPanel, DetailSection } from '@un-eosg/ui/components/detail-panel'
import { DetailPanelControls } from '@un-eosg/ui/components/detail-panel-controls'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  DesignationDetails,
  EmailLink,
} from '@/components/focal-points/DirectorySummaryPanel'
import {
  SYSTEM_DIRECTORY_GROUPS,
  type SystemDirectoryEntity,
} from '@/lib/system-directory'

function ResourceLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  const className = 'text-un-blue-text hover:underline'
  return href.startsWith('/') ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  )
}

export function SystemEntityPanel({
  entity,
  open,
  onOpenChange,
  focalPointsAvailable,
  onCloseAutoFocus,
}: {
  entity: SystemDirectoryEntity | null
  open: boolean
  onOpenChange: (open: boolean) => void
  focalPointsAvailable: boolean
  onCloseAutoFocus: (event: Event) => void
}) {
  const system = entity?.system
  return (
    <Sheet open={open && entity !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        hideClose
        onCloseAutoFocus={onCloseAutoFocus}
        className="mr-[calc(var(--removed-body-scroll-bar-size,0px)*-1)] flex w-full flex-col gap-0 p-0 sm:max-w-xl lg:max-w-2xl"
      >
        {entity && (
          <>
            <SheetTitle className="sr-only">
              {entity.code} — entity details
            </SheetTitle>
            <SheetDescription className="sr-only">
              Governing bodies, contacts, focal points and resources for{' '}
              {entity.name ?? entity.code}.
            </SheetDescription>
            <DetailPanel
              eyebrow={
                SYSTEM_DIRECTORY_GROUPS.find(
                  (group) => group.id === entity.group
                )?.label
              }
              title={entity.code}
              headerMetadata={<span>{entity.name}</span>}
              bodyClassName="un-scrollbar px-5 py-6"
              controls={
                <DetailPanelControls
                  close={{
                    label: 'Close',
                    onClick: () => onOpenChange(false),
                    icon: <X aria-hidden className="h-4 w-4" />,
                  }}
                />
              }
            >
              <div className="space-y-8">
                {(system?.homepage ||
                  system?.note ||
                  entity.parentCode ||
                  system?.secretariatAdministered) && (
                  <div className="space-y-2 text-sm">
                    {system?.homepage && (
                      <ResourceLink href={system.homepage}>
                        Official website
                      </ResourceLink>
                    )}
                    {(entity.parentCode || system?.secretariatAdministered) && (
                      <p className="text-muted-foreground">
                        {entity.group === 'commissions'
                          ? 'The commission’s secretariat is part of the UN Secretariat; its governing body is listed below.'
                          : entity.parentCode
                            ? 'Part of the UN Secretariat.'
                            : 'Its secretariat is part of the UN Secretariat; shown here in its UN system category.'}
                      </p>
                    )}
                    {system?.note && <p>{system.note}</p>}
                  </div>
                )}

                <DetailSection heading="Governing bodies">
                  {entity.governingBodies?.length ? (
                    <ul className="space-y-5">
                      {entity.governingBodies.map((body, index) => (
                        <li key={`${body.name}-${index}`} className="space-y-1">
                          <div className="font-medium">
                            {body.url ? (
                              <ResourceLink href={body.url}>
                                {body.name}
                              </ResourceLink>
                            ) : (
                              body.name
                            )}
                          </div>
                          {body.overview && (
                            <p className="text-xs text-muted-foreground">
                              Link opens the governing-bodies overview.
                            </p>
                          )}
                          {body.note && (
                            <p className="text-sm text-muted-foreground">
                              {body.note}
                            </p>
                          )}
                          {body.contacts?.map((contact, index) => (
                            <div key={index} className="text-sm">
                              {contact.label && <p>{contact.label}</p>}
                              {contact.email ? (
                                <EmailLink address={contact.email} />
                              ) : contact.url ? (
                                <ResourceLink href={contact.url}>
                                  Contact
                                </ResourceLink>
                              ) : null}
                            </div>
                          ))}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Governing-body information has not yet been added for this
                      entity.
                    </p>
                  )}
                </DetailSection>

                <DetailSection heading="Focal points and entity contacts">
                  {!focalPointsAvailable ? (
                    <p className="text-sm text-muted-foreground">
                      Focal-point information is temporarily unavailable. Please
                      reload to try again.
                    </p>
                  ) : entity.designations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No current focal-point designation is publicly listed for
                      this entity.
                    </p>
                  ) : (
                    <div className="space-y-8">
                      {entity.designations.map((designation) => (
                        <section
                          key={designation.id}
                          className="space-y-4 border-t border-border pt-4 first:border-0 first:pt-0"
                        >
                          <h3 className="font-semibold">
                            {designation.subUnit}
                          </h3>
                          <DesignationDetails designation={designation} />
                        </section>
                      ))}
                      <p className="text-xs text-muted-foreground">
                        Coverage is as claimed by each designation and may
                        overlap.
                      </p>
                    </div>
                  )}
                </DetailSection>

                <DetailSection heading="Document registries">
                  {system?.mandateRegistry.length ? (
                    <ul className="space-y-3">
                      {system.mandateRegistry.map((registry) => (
                        <li key={registry.url}>
                          <ResourceLink href={registry.url}>
                            {registry.name}
                          </ResourceLink>
                          <p className="text-xs text-muted-foreground">
                            {registry.category}
                            {registry.scope === 'this-site'
                              ? ' · Coverage in this Mandate Registry'
                              : ''}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No document registry is listed.
                    </p>
                  )}
                  {system?.registryNote && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {system.registryNote}
                    </p>
                  )}
                </DetailSection>

                {!!system?.resources.length && (
                  <DetailSection heading="Other resources">
                    <ul className="space-y-2">
                      {system.resources.map((resource) => (
                        <li key={resource.url}>
                          <ResourceLink href={resource.url}>
                            {resource.name}
                          </ResourceLink>
                        </li>
                      ))}
                    </ul>
                  </DetailSection>
                )}
              </div>
            </DetailPanel>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
