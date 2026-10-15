/** Keep Sentry's shadow-root widget inside the active Radix modal scope. */
export function connectFeedbackToModals(host: HTMLElement): void {
  // A manual popover stays in the top layer without making the page inert.
  // This lets the fixed widget escape a dialog's transforms and clipping while
  // remaining its DOM descendant for Radix focus and outside-click handling.
  host.popover = 'manual'
  Object.assign(host.style, {
    position: 'fixed',
    inset: '0 auto auto 0',
    width: '0',
    height: '0',
    margin: '0',
    padding: '0',
    border: '0',
    overflow: 'visible',
    background: 'transparent',
    pointerEvents: 'auto',
  })

  const syncParent = () => {
    const modals = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[role="dialog"][data-state="open"], ' +
          '[role="alertdialog"][data-state="open"]'
      )
    )
    const parent = modals.at(-1) ?? document.body
    if (host.parentElement !== parent) {
      host.hidePopover()
      parent.appendChild(host)
    }
    // Radix may have hidden the body-level host before this observer moved it.
    host.removeAttribute('aria-hidden')
    host.removeAttribute('data-aria-hidden')
    if (!host.matches(':popover-open')) host.showPopover()
  }

  const observer = new MutationObserver(syncParent)
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-state'],
  })
  syncParent()

  const shadow = host.shadowRoot
  if (!shadow) return

  const openDialog = () =>
    shadow.querySelector<HTMLDialogElement>('dialog[open]')
  const trigger = () =>
    shadow.querySelector<HTMLButtonElement>('.widget__actor')
  const focusableElements = (dialog: HTMLElement) =>
    Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button, input, textarea, select, a[href], [tabindex]'
      )
    ).filter(
      (element) =>
        element.tabIndex >= 0 &&
        !element.matches(':disabled') &&
        element.getClientRects().length > 0
    )

  // Radix cannot enumerate tabbable elements across a shadow boundary. Keep
  // keyboard navigation in the feedback form and close it before the sidebar.
  window.addEventListener(
    'keydown',
    (event) => {
      const dialog = openDialog()
      if (!dialog) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        // Sentry closes the form when its own backdrop is clicked.
        dialog.click()
      } else if (
        event.key === 'Tab' &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        const elements = focusableElements(dialog)
        const first = elements[0]
        const last = elements.at(-1)
        if (
          first &&
          last &&
          (!dialog.contains(shadow.activeElement) ||
            (event.shiftKey
              ? shadow.activeElement === first
              : shadow.activeElement === last))
        ) {
          event.preventDefault()
          const destination = event.shiftKey ? last : first
          destination.focus()
        }
      }
    },
    { capture: true }
  )

  let wasOpen = false
  const formObserver = new MutationObserver(() => {
    const dialog = openDialog()
    if (dialog && !wasOpen) focusableElements(dialog)[0]?.focus()
    if (!dialog && wasOpen) trigger()?.focus({ preventScroll: true })
    wasOpen = dialog !== null
  })
  formObserver.observe(shadow, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['open'],
  })
}
