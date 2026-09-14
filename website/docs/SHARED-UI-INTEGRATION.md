# Shared UI integration

Mandates imports the shared header, footer, animated corner logo, detail panel
and controls, and document symbol. Wrappers retain route selection, English copy
(there are no locale catalogues yet), the home-only corner mark, PDF source, and
intercepted-route close/back behavior. Opening the full page remains a native
anchor and preserves the complete query string.

The UI contribution lives in the companion Codebox worktree
/home/agent/.worktrees/ui-mandates-integration, branch agent/mandates-shared-ui.
It adds header metadata/body slots, native-link panel actions, footer navigation
labels/donation override, and canonical standalone DocumentSymbol with Storybook
variants and a registry item. Existing concepts imports reexport the same symbol.

## Published dependency

The shared APIs are published in UI commit 1533fc8. Mandates now pins that
reachable commit in package.json and pnpm-lock.yaml; a normal pnpm install
resolves the shared components. The earlier publication gate is resolved.

### Historical pre-publication verification

For local verification, the UI commit was packed with pnpm pack and its package
contents unpacked into this worktree's generated node_modules/@un-eosg/ui.
The tarball is /home/agent/.worktrees/shared-ui-verification/un-eosg-ui-0.1.5.tgz.
This replaces only the generated dependency installation; it changes no tracked
manifest or lockfile, and resolves React peers from the consumer.

A live symlink passed TypeScript but failed Turbopack because the target was
outside the app's filesystem root. After installing the packed dependency, the
old symlink path remained in the failed build cache; clearing only this isolated
worktree's generated .next directory fixed that. Avoid pnpm link: recent pnpm
versions also alter the manifest and lockfile. A forced reinstall restores the
declared dependency.

The combined branch (shared UI + metrics + fulltext display) passed next build:
compilation, TypeScript and 9/9 static pages. Six relevant shared CSS selectors
were verified in the emitted production CSS. The initial symlink build and its
cached retry failed; the clean packed-dependency build passed.

## Intentional shared visual updates

The corner mark now uses the shared combined asset at 123px (previously 110px
plus a separate animated overlay), is hidden below the md breakpoint, and uses
the shared 1.5s/2.5s entrance sequence. It now honors reduced-motion preferences.
The header adopts the shared menu control/wordmark spacing; the panel adopts
shared title sizing, padding and controls. These are component adoption changes,
not a claim of pixel parity.

## Verification bar

- DocumentSymbol old concepts export and standalone export are identical.
- Current Mandates light background, proportional type and subdued styling survive.
- Full-page control renders an anchor with complete query scope; disabled actions
  cannot navigate; close and outside/Escape dismissal preserve router.back().
- Header metadata stays outside the single scrolling panel body.
- Shared APIs and both consumers pass TypeScript checks.
- All new variants appear under Concepts/DocumentSymbol in Storybook.

Disposable server-render assertions cover structural rendering contracts.
No browser checks were requested; scrolling, focus behavior and responsive visual
appearance remain an explicit visual-review limitation.
