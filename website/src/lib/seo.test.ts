import { test } from 'node:test'
import assert from 'node:assert/strict'
import { documentSeo, mandatePath, serializeJsonLd } from '#lib/seo'

test('document canonical is independent of budget context and encodes symbols', () => {
  const record = { symbol: 'A/RES/55/33[E]', title: 'A title', year: 2000 }
  assert.equal(mandatePath(record.symbol), '/mandate/A/RES/55/33%5BE%5D')
  assert.deepEqual(documentSeo(record).alternates, {
    canonical: mandatePath(record.symbol),
    types: { 'application/json': `${mandatePath(record.symbol)}.json` },
  })
})
test('JSON-LD cannot terminate its script element', () => {
  const input = { title: '</script><script>alert(1)</script>' }
  const serialized = serializeJsonLd(input)
  assert.ok(!serialized.includes('<'))
  assert.deepEqual(JSON.parse(serialized), input)
})
