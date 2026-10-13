/** Shared content widths; the descriptive title receives all remaining space. */
export const mandateDetailTableClassName =
  'w-full min-w-[44rem] table-fixed border-y border-border text-left text-sm text-foreground'

export const mandateDetailTableHeaderClassName =
  'text-xs font-medium text-muted-foreground'

export const mandateDetailTableCellClassName =
  'min-w-0 py-1 pr-3 pl-0 align-baseline'

export function MandateDetailTableColumns({
  budget = false,
}: {
  budget?: boolean
}) {
  return (
    <colgroup>
      <col className={budget ? 'w-20 @min-[52rem]:w-24' : 'w-16'} />
      <col className={budget ? 'w-28 @min-[52rem]:w-32' : 'w-40'} />
      <col />
      <col className={budget ? 'w-28 @min-[52rem]:w-36' : 'w-24'} />
      <col className={budget ? 'w-36 @min-[52rem]:w-40' : 'w-40'} />
    </colgroup>
  )
}
