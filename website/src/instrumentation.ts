export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (
    process.env.NODE_ENV !== 'production' ||
    process.env.RUNTIME_DIAGNOSTICS === '0'
  )
    return
  const { startRuntimeDiagnostics } = await import('./lib/runtime/diagnostics')
  startRuntimeDiagnostics()
}
