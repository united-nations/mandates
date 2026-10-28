import pilot from '@/data/implementation-evidence-pilot.json'
import {
  normalizeEvidenceSymbol,
  type ImplementationEvidenceCase,
} from '../implementation-evidence'

// Bounded research fixture, read on the server. Only the selected case is sent
// to the fulltext component; the entire seven-report corpus is not a client import.
// Source hashes, exact passages, matching rationale and review dates travel with
// the fixture. These are the October 15 sample, not a live latest-report query.
const cases = pilot as readonly ImplementationEvidenceCase[]

export function getImplementationEvidenceCase(
  symbol: string
): ImplementationEvidenceCase | null {
  return cases.find(
    (item) => normalizeEvidenceSymbol(item.symbol) === normalizeEvidenceSymbol(symbol)
  ) ?? null
}
