# Color System

All colors must come from CSS variables defined in `src/app/globals.css`. Never use raw hex values, `rgb()`, or Tailwind arbitrary color values like `bg-[#RRGGBB]` in components.

## Brand Colors (`@theme`)

| Token            | Variable                   | Hex       | Tailwind class                                 |
| ---------------- | -------------------------- | --------- | ---------------------------------------------- |
| UN Blue          | `--color-un-blue`          | `#009edb` | `text-un-blue`, `bg-un-blue`, `border-un-blue` |
| Trout            | `--color-trout`            | `#495057` | `text-trout`                                   |
| Shuttle Gray     | `--color-shuttle-gray`     | `#5a6c7d` | `text-shuttle-gray`                            |
| Camouflage Green | `--color-camouflage-green` | `#7d8471` | `bg-camouflage-green`                          |
| Pale Oyster      | `--color-pale-oyster`      | `#9bbb7a` | `bg-pale-oyster`                               |
| Smoky            | `--color-smoky`            | `#6c5b7b` | `bg-smoky`                                     |
| Au Chico         | `--color-au-chico`         | `#a0665c` | `bg-au-chico`                                  |
| Faded Jade       | `--color-faded-jade`       | `#4a7c7e` | `bg-faded-jade`                                |

## Neutral Colors (`@theme`)

| Token     | Variable            | Hex       | Notes                   |
| --------- | ------------------- | --------- | ----------------------- |
| Card Gray | `--color-card-gray` | `#f6f7f8` | Card/surface background |
| Geyser    | `--color-geyser`    | `#dde2e6` | Light border/divider    |
| Iron      | `--color-iron`      | `#d9dcdf` | Light border/divider    |

## Semantic Colors (shadcn, `:root`)

These are exposed to Tailwind via `@theme inline` as `--color-*` and usable as utility classes.

| Semantic token   | Maps to                 |
| ---------------- | ----------------------- |
| `bg-background`  | white                   |
| `bg-card`        | `hsl(220 20% 97%)`      |
| `bg-muted`       | `hsl(220 15% 88%)`      |
| `bg-accent`      | `var(--color-un-blue)`  |
| `bg-destructive` | `var(--color-au-chico)` |
| `border-border`  | `hsl(220 13% 91%)`      |

## Tailwind Built-in Grays

Prefer these over custom neutrals for UI chrome (borders, dividers, hover states):

| Class      | Approximate hex                                 |
| ---------- | ----------------------------------------------- |
| `gray-100` | `#f3f4f6`                                       |
| `gray-200` | `#e5e7eb` — default border color (set globally) |
| `gray-300` | `#d1d5db`                                       |
| `gray-400` | `#9ca3af`                                       |
| `gray-500` | `#6b7280`                                       |

## UN Blue Tints

UN Blue (`#009edb`) is used extensively as opacity tints. Two syntaxes are in use depending on context.

### In TSX — Tailwind opacity modifier

| Value | Usage pattern                               | Examples                         |
| ----- | ------------------------------------------- | -------------------------------- |
| `/5`  | Very subtle alert background                | `bg-un-blue/5`                   |
| `/10` | Active/selected state bg (dominant pattern) | `bg-un-blue/10` + `text-un-blue` |
| `/15` | Active filter button bg                     | `bg-un-blue/15!`                 |
| `/20` | Hover on `/15` bg                           | `hover:bg-un-blue/20`            |
| `/25` | Hover on `/15` (filter buttons)             | `hover:bg-un-blue/25!`           |
| `/30` | Decorative underline / border               | `decoration-un-blue/30`          |
| `/60` | Progress bar fill                           | `bg-un-blue/60`                  |
| `/75` | Badge/chip background                       | `bg-un-blue/75!`                 |
| `/80` | Hover state on text links                   | `hover:text-un-blue/80`          |
| `/90` | Hover state on solid button                 | `hover:bg-un-blue/90`            |

**Standard active state:** `bg-un-blue/10 text-un-blue` — used across sidebar items, dropdowns, filter buttons, and data cards. Always pair these two together.

### In CSS (globals.css) — `color-mix`

Used for PrimeReact component overrides where Tailwind classes cannot reach.

| Value | Context                                        |
| ----- | ---------------------------------------------- |
| `4%`  | Table row hover (very subtle)                  |
| `6%`  | Sortable column header hover                   |
| `8%`  | Dropdown item hover / table highlight bg       |
| `12%` | Dropdown item selected / table highlight hover |
| `15%` | Search highlight background                    |
| `25%` | Search highlight exact match background        |
| `30%` | Search highlight border                        |
| `50%` | Search highlight exact match border            |

Pattern: `color-mix(in srgb, var(--color-un-blue) X%, transparent)`

### Inconsistencies to watch

- Filter buttons in [ParagraphSection.tsx](../src/components/ParagraphSection.tsx) use `/15`+`/25` for active state vs. `/10` everywhere else — intentional stronger emphasis, but keep consistent within that component.
- Avoid introducing new tint values outside the steps above; prefer the nearest existing level.

## Rules

- **Never** use `#RRGGBB` hex literals or `rgb()` in `.tsx`/`.ts` files.
- **Never** use Tailwind arbitrary color values (`bg-[#...]`).
- SVG `fill`/`stroke` props that need a color at runtime: use `var(--color-*)`.
- UN Blue opacity tints in `.css` files: use `color-mix(in srgb, var(--color-un-blue) X%, transparent)`.
