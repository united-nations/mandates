import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sidebarHref, sharedSidebarTarget } from '#lib/sidebar-link'

test('sidebar links round-trip bracket symbols and preserve explorer and cycle scope', () => {
  const search =
    'entity=DESA&ppb_version=ppb2026&group=1&page=3&keyword=peace+security'
  const href = sidebarHref('A/RES/55/33[E]', search)
  const url = new URL(href, 'https://mandates.un.org')
  assert.equal(url.pathname, '/secretariat')
  const target = sharedSidebarTarget(url.hash, url.search)
  assert.equal(target, '/mandate/A/RES/55/33%5BE%5D?' + search)
})
test('unrelated hashes and control-character identities are ignored', () => {
  assert.equal(sharedSidebarTarget('#methodology', ''), null)
  assert.equal(sharedSidebarTarget('#mandate=A%00B', ''), null)
  assert.equal(sharedSidebarTarget('#mandate=', ''), null)
  assert.equal(sharedSidebarTarget('#mandate=' + 'A'.repeat(501), ''), null)
})

test('untrusted shared identities cannot escape mandate routes', () => {
  for (const symbol of [
    '../../api/health',
    'A/../api',
    './A/RES/1',
    'A//RES/1',
    '/api/health',
    'A\\..\\api',
  ]) {
    assert.equal(
      sharedSidebarTarget('#mandate=' + encodeURIComponent(symbol), ''),
      null,
      symbol
    )
  }
})
