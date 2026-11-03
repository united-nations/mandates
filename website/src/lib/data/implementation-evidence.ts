import pilot from '@/data/implementation-evidence-pilot.json'
import {
  normalizeEvidenceSymbol,
  type ImplementationEvidenceCase,
} from '../implementation-evidence'

// Bounded research fixture, read on the server. Only the selected case is sent
// to the fulltext component; the entire seven-report corpus is not a client import.
// All operative provisions (including annex children) have review decisions.
// Source hashes, exact passages, matching rationale and review dates travel with
// the fixture. The archived corpus and independent coverage manifest live under
// data/references/implementation-evidence. This is a fixed report sample.
const cases = pilot as readonly ImplementationEvidenceCase[]

export const IMPLEMENTATION_EXAMPLE_SYMBOLS = cases.map((item) =>
  normalizeEvidenceSymbol(item.symbol)
)

export function getImplementationEvidenceCase(
  symbol: string
): ImplementationEvidenceCase | null {
  return cases.find(
    (item) => normalizeEvidenceSymbol(item.symbol) === normalizeEvidenceSymbol(symbol)
  ) ?? null
}
