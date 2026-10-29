import { agentGuide } from '@/lib/agent-reference'
import { PUBLIC_HEADERS } from '@/lib/public-api'
export function GET() {
  return new Response(agentGuide(true), {
    headers: { ...PUBLIC_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
