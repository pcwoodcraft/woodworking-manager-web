import test from 'node:test'
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('./client.js', import.meta.url), 'utf8')
const testableSource = source.replace(
  "import { API_URL } from '../config'",
  "const API_URL = 'https://example.test'",
)
const { apiCall } = await import(`data:text/javascript;base64,${Buffer.from(testableSource).toString('base64')}`)

test('čítanie zopakuje dočasnú INTERNAL chybu', async (t) => {
  const originalFetch = globalThis.fetch
  const originalSetTimeout = globalThis.setTimeout
  let calls = 0

  t.after(() => {
    globalThis.fetch = originalFetch
    globalThis.setTimeout = originalSetTimeout
  })

  globalThis.setTimeout = (callback) => {
    callback()
    return 0
  }
  globalThis.fetch = async () => {
    calls += 1
    return new Response(JSON.stringify(calls === 1
      ? { ok: false, error: 'INTERNAL', message: 'Nastala neočakávaná chyba servera.' }
      : { ok: true, data: ['načítané'] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  assert.deepEqual(await apiCall('getTimeEntryFormData'), ['načítané'])
  assert.equal(calls, 2)
})
