# Colour roles

Source of truth: `@un-eosg/ui/tokens/theme.css`, reviewed in the UI library's
Storybook Palette. Mandates imports `@un-eosg/ui/theme.css` and defines its semantic
role aliases in `src/app/globals.css`.

## Text and surfaces

| Role | Shared token |
| --- | --- |
| foreground, card-foreground, popover-foreground | un-black |
| background, card, popover | un-white |
| muted-foreground | neutral-text |
| muted, secondary | neutral-surface |
| secondary-foreground | un-black |
| border, input | neutral-border |
| accent | un-blue-tint-50 |
| accent-foreground | un-blue-shade |
| primary | un-blue-text |
| primary-foreground | un-white |
| destructive | un-red-text |
| destructive-foreground | un-white |
| ring | un-blue |

Use semantic classes such as `text-foreground`, `text-muted-foreground`,
`bg-secondary` and `border-border` in components. Light neutrals are surfaces,
not readable text. Do not dim entire records to communicate status.

## Blue

- Links on white: `text-un-blue-text` (AA, 4.85:1).
- Text on blue-tinted surfaces: `text-accent-foreground` (un-blue-shade).
- Filled controls with white labels: `bg-primary text-primary-foreground`.
- Bright `un-blue` remains for brand accents, chart marks and focus indicators.
- Do not use bright blue as small text on white or behind small white labels.
- The AAA text-blue variant is not the default for this app.

DocumentSymbol owns document-identifier presentation. Its size is 12px.

## Charts and highlights

Heatmap hue definitions reference shared CSS tokens, and colour-mix interpolates
in sRGB using the existing gamma curve. Do not change category assignments or
intensity scales during colour-token maintenance. Text labels stay black.

Search matches use `bg-un-blue-tint-50 text-un-blue-shade`. Data annotations may
use the library's accent tints; errors use the destructive role. WIP is neutral
supporting text.

## Dependency delivery

The matching UI source changes live in the sibling UI checkout. Until a shared
release is available, pnpm's checked-in dependency patch delivers these tokens
and component colour fixes without a remote push or publication.

## Checks

Normal text must reach 4.5:1 against its actual background; large text and
essential non-text controls need 3:1. Check coloured washes as well as white.
Raw colour constants belong in the token package, not component markup.
Use `var(--role)`, not `hsl(var(--role))`: roles contain complete CSS colours.
