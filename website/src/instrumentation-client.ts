// Next.js client-side instrumentation. Runs once when the browser bundle boots.
// Its only job here is to mount Sentry's user-feedback widget so people can
// report issues (with an optional screenshot) straight from the page — it
// replaces the old Airtable "Give Feedback" link.
//
// Scope is deliberately feedback-only: error/performance reporting is left off
// (see `beforeSend` below) so this new Sentry project stays a clean feedback
// inbox. Flip `beforeSend` off to also capture client errors later.
import * as Sentry from '@sentry/nextjs'
import { connectFeedbackToModals } from '@/lib/feedback-modal'

// Only initialise when a DSN is configured (set NEXT_PUBLIC_SENTRY_DSN in the
// Azure app env). With no DSN — local dev, contributor builds — the widget
// simply doesn't mount, so nothing changes locally.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_AZURE_ENV || process.env.NODE_ENV,
    tracesSampleRate: 0,
    // Feedback-only: drop error/message events so the project receives just
    // user feedback. `beforeSend` does not apply to feedback events (those go
    // through `beforeSendFeedback`), so the widget still works. Remove this to
    // enable client error capture.
    beforeSend: () => null,
    integrations: [
      Sentry.feedbackIntegration({
        colorScheme: 'light',
        showBranding: false,
        // The widget runs in a Shadow DOM, so CSS vars from the host page
        // aren't visible — hardcode the hex matching --color-un-blue.
        themeLight: {
          accentBackground: '#009edb',
          accentForeground: '#ffffff',
          // No box shadow — a soft white halo around the trigger reads as an
          // odd glow.
          boxShadow: 'none',
          borderRadius: '0.5rem',
        },
        // `triggerLabel` (not `buttonLabel`) is the right key for the floating
        // button text per @sentry/core FeedbackTextConfiguration.
        triggerLabel: 'Give Feedback',
        triggerAriaLabel: 'Open feedback form',
        formTitle: 'Share feedback',
        submitButtonLabel: 'Send',
        messagePlaceholder:
          "What's not working, confusing, or could be better?",
        // Name and email are optional (Sentry's `isNameRequired` /
        // `isEmailRequired` both default to false). Sentry only marks
        // *required* fields, so spell out "(optional)" to make it clear people
        // can skip them.
        nameLabel: 'Name (optional)',
        emailLabel: 'Email (optional)',
      }),
    ],
  })

  // Sentry's feedback widget has no `showIcon` option, so hide the megaphone
  // by injecting CSS into the widget's shadow root once it mounts. The host
  // element is `#sentry-feedback`; the trigger's icon is the inline <svg>.
  const hideIcon = (host: Element) => {
    const shadow = (host as HTMLElement).shadowRoot
    if (!shadow || shadow.querySelector('style[data-feedback-icon-hide]'))
      return
    const style = document.createElement('style')
    style.setAttribute('data-feedback-icon-hide', '')
    style.textContent =
      '.widget__actor { border-radius: 0.5rem; } ' +
      '.widget__actor svg { display: none; } ' +
      // Sentry renders the "(required)" marker shrunk to 0.85em; our
      // "(optional)" labels are full-size label text. Force the marker back to
      // 1em so both parentheticals render in the same font.
      '.form__label__text--required { font-size: 1em; } ' +
      // On small screens Sentry hides the label, leaving an empty button. Hide
      // the trigger entirely below the Tailwind `sm` breakpoint.
      '@media (max-width: 639px) { .widget__actor { display: none; } }'
    shadow.appendChild(style)
  }
  const existing = document.getElementById('sentry-feedback')
  if (existing) {
    hideIcon(existing)
    connectFeedbackToModals(existing)
  }
  const observer = new MutationObserver(() => {
    const host = document.getElementById('sentry-feedback')
    if (host) {
      observer.disconnect()
      hideIcon(host)
      connectFeedbackToModals(host)
    }
  })
  if (!existing)
    observer.observe(document.body, { childList: true, subtree: true })
}

// Required by Next 15+ for client-side router instrumentation.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
