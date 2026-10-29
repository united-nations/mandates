import { readFileSync, writeFileSync } from 'node:fs'
import { buildPublicOpenApi } from '#lib/public-openapi'
const path = new URL('../public/openapi.json', import.meta.url)
const generated = JSON.stringify(buildPublicOpenApi(), null, 2) + '\n'
if (process.argv.includes('--check')) {
  if (readFileSync(path, 'utf8') !== generated) {
    console.error(
      'OpenAPI is stale. Run pnpm generate-openapi and commit public/openapi.json.'
    )
    process.exitCode = 1
  }
} else {
  writeFileSync(path, generated)
  process.stdout.write('Generated public/openapi.json\n')
}
