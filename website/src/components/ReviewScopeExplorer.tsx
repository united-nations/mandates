'use client'

import { useId, useMemo, useState } from 'react'

import { YearOverlayTrend } from '@/components/YearOverlayTrend'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { explainerTexts } from '@/lib/en_text_contents'
import {
  calculateReviewScope,
  reviewCitationModes,
  REVIEW_CITATION_CATEGORIES,
  type ReviewCitationMode,
  type ReviewCitationModes,
  type ReviewScopeGroup,
} from '@/lib/review-scope'

const modes: ReviewCitationMode[] = ['include', 'neutral', 'exclude']

export function ReviewScopeExplorer({
  groups,
  currentYear,
  versionLabel,
}: {
  groups: ReviewScopeGroup[]
  currentYear: number
  versionLabel: string
}) {
  const id = useId()
  const [windowYears, setWindowYears] = useState(5)
  const [excludeOlder, setExcludeOlder] = useState(false)
  const [excludeEarlierVersions, setExcludeEarlierVersions] = useState(false)
  const [citationModes, setCitationModes] = useState<ReviewCitationModes>(() =>
    reviewCitationModes('neutral')
  )
  const [excludeSecurityCouncil, setExcludeSecurityCouncil] = useState(false)
  const result = useMemo(
    () =>
      calculateReviewScope(
        groups,
        currentYear,
        windowYears,
        citationModes,
        excludeSecurityCouncil,
        excludeOlder,
        excludeEarlierVersions
      ),
    [
      groups,
      currentYear,
      windowYears,
      citationModes,
      excludeSecurityCouncil,
      excludeOlder,
      excludeEarlierVersions,
    ]
  )
  const texts = explainerTexts.reviewScope
  const categoryLabels = explainerTexts.citationTrend
  const format = (template: string, values: Record<string, string | number>) =>
    template.replace(/\{(\w+)\}/g, (match, key: string) =>
      String(values[key] ?? match)
    )
  const list = (mode: ReviewCitationMode) =>
    new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(
      REVIEW_CITATION_CATEGORIES.filter(
        (category) => citationModes[category] === mode
      ).map((category) => categoryLabels[category])
    )
  const included = list('include')
  const excluded = list('exclude')
  const preview = [
    format(texts.previewStart, { total: result.total.toLocaleString() }),
    excludeEarlierVersions ? texts.previewEarlierVersions : '',
    excludeOlder ? format(texts.previewAge, { start: result.startYear }) : '',
    included
      ? format(texts.previewInclude, {
          categories: included,
          version: versionLabel,
        })
      : '',
    excluded
      ? format(texts.previewExclude, {
          categories: excluded,
          version: versionLabel,
        })
      : '',
    excludeSecurityCouncil ? texts.previewSecurityCouncil : '',
    !excluded &&
    !excludeSecurityCouncil &&
    !excludeOlder &&
    !excludeEarlierVersions
      ? texts.previewNoExclude
      : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="space-y-4">
      <div>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Checkbox
              id={`${id}-earlier`}
              checked={excludeEarlierVersions}
              onCheckedChange={(checked) =>
                setExcludeEarlierVersions(checked === true)
              }
            />
            <label htmlFor={`${id}-earlier`}>
              {texts.excludeEarlierVersions}
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <div className="inline-flex flex-wrap items-center gap-2">
              <Checkbox
                id={`${id}-age`}
                aria-label={format(texts.excludeOlder, { years: windowYears })}
                checked={excludeOlder}
                onCheckedChange={(checked) => setExcludeOlder(checked === true)}
              />
              <label htmlFor={`${id}-age`}>{texts.excludeOlderBefore}</label>
              <label htmlFor={`${id}-years`} className="sr-only">
                {explainerTexts.documentTrend.windowLabel}
              </label>
              <Input
                id={`${id}-years`}
                className="h-8 w-20 text-xs"
                type="number"
                min={1}
                max={result.maxWindow}
                step={1}
                value={windowYears}
                disabled={!excludeOlder}
                onChange={(event) => {
                  const value = event.target.valueAsNumber
                  if (
                    Number.isInteger(value) &&
                    value >= 1 &&
                    value <= result.maxWindow
                  )
                    setWindowYears(value)
                }}
              />
              <span>{texts.excludeOlderAfter}</span>
            </div>
            <span className="text-muted-foreground">
              {format(texts.windowRange, {
                start: result.startYear,
                end: result.endYear,
              })}
            </span>
            {excludeOlder && result.endYear === currentYear && (
              <span className="text-xs text-muted-foreground">
                {format(explainerTexts.documentTrend.partialYear, {
                  year: result.endYear,
                })}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <div className="space-y-1.5">
              <label
                htmlFor={`${id}-all-cited`}
                className="text-xs font-medium"
              >
                {texts.allCited}
              </label>
              <Select
                value={
                  REVIEW_CITATION_CATEGORIES.every(
                    (category) =>
                      citationModes[category] === citationModes.foundational
                  )
                    ? citationModes.foundational
                    : 'mixed'
                }
                onValueChange={(value) => {
                  if (
                    value === 'include' ||
                    value === 'neutral' ||
                    value === 'exclude'
                  )
                    setCitationModes(reviewCitationModes(value))
                }}
              >
                <SelectTrigger id={`${id}-all-cited`} className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mixed" disabled>
                    {texts.mixed}
                  </SelectItem>
                  {modes.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {texts[mode]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {REVIEW_CITATION_CATEGORIES.map((category) => (
              <div key={category} className="space-y-1.5">
                <label
                  htmlFor={`${id}-${category}`}
                  className="text-xs font-medium"
                >
                  {categoryLabels[category]}
                </label>
                <Select
                  value={citationModes[category]}
                  onValueChange={(value) => {
                    if (
                      value === 'include' ||
                      value === 'neutral' ||
                      value === 'exclude'
                    )
                      setCitationModes((previous) => ({
                        ...previous,
                        [category]: value,
                      }))
                  }}
                >
                  <SelectTrigger
                    id={`${id}-${category}`}
                    className="h-8 text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {modes.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {texts[mode]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Checkbox
              id={`${id}-sc`}
              checked={excludeSecurityCouncil}
              onCheckedChange={(checked) =>
                setExcludeSecurityCouncil(checked === true)
              }
            />
            <label htmlFor={`${id}-sc`}>{texts.excludeSecurityCouncil}</label>
          </div>
          <p className="text-xs text-muted-foreground">{texts.precedence}</p>
          <p className="text-xs text-muted-foreground">
            {format(texts.versionLens, { version: versionLabel })}
          </p>
        </div>
      </div>
      <p aria-live="polite" className="max-w-3xl text-sm">
        {preview}
      </p>
      <details className="text-sm">
        <summary className="cursor-pointer font-medium">
          {texts.details}
        </summary>
        <p className="mt-3 mb-3 max-w-3xl text-xs text-muted-foreground">
          {format(texts.universe, { version: versionLabel })}
        </p>
        <p className="mb-3 text-xs text-muted-foreground">
          {texts.earlierPolicy}
        </p>
        <h3 className="mb-2 text-sm font-medium">{texts.overlapHeading}</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          {format(texts.membershipNote, {
            start: result.startYear,
            end: result.endYear,
          })}
        </p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="py-2 pr-3 font-medium">
                {texts.group}
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                {texts.total}
              </th>
              <th scope="col" className="py-2 font-medium">
                {texts.selected}
              </th>
            </tr>
          </thead>
          <tbody>
            {(
              Object.keys(result.overlaps) as (keyof typeof result.overlaps)[]
            ).map((key) => (
              <tr key={key} className="border-b border-border">
                <th scope="row" className="py-2 pr-3 font-normal">
                  {texts[key]}
                </th>
                <td className="py-2 pr-3 tabular-nums">
                  {result.overlaps[key].total.toLocaleString()}
                </td>
                <td className="py-2 tabular-nums">
                  {result.overlaps[key].remaining.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">
          {format(texts.securityCouncilMembership, {
            total: result.securityCouncil.total.toLocaleString(),
            remaining: result.securityCouncil.remaining.toLocaleString(),
          })}
        </p>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {REVIEW_CITATION_CATEGORIES.map((category) => (
            <div key={category}>
              <dt className="text-xs text-muted-foreground">
                {categoryLabels[category]}
              </dt>
              <dd className="tabular-nums">
                {result.citations[category].toLocaleString()}
              </dd>
            </div>
          ))}
        </dl>
      </details>
      <div>
        <h3 className="mb-3 text-sm font-medium">{texts.trendHeading}</h3>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-sm bg-gray-300"
                />
                {texts.total}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-sm bg-un-blue"
                />
                {texts.selected}
              </span>
            </div>
            <YearOverlayTrend
              data={result.years}
              boundaryYear={excludeOlder ? result.startYear : undefined}
              showComposition={false}
              totalLabel={texts.total}
              highlightLabel={texts.selected}
              complementLabel={texts.exclude}
              totalHoverLabel={explainerTexts.documentTrend.total}
              highlightHoverLabel={texts.trendHover}
            />
          </div>
          <div
            aria-live="polite"
            aria-atomic="true"
            className="space-y-2 border-t border-border pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5"
          >
            <p className="text-sm font-medium">{texts.remaining}</p>
            <p className="text-4xl font-semibold text-foreground tabular-nums">
              {result.remaining.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(texts.share, {
                percent: result.share.toFixed(1),
                total: result.total.toLocaleString(),
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
