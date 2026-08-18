import test from 'node:test'
import assert from 'node:assert/strict'
import * as files from './files.js'

test('uploadQuotePdf odošle stabilné clientUploadId v skutočnom API payloade', async (t) => {
  const calls = []
  const apiCall = async (action, payload) => {
    calls.push({ action, payload })
    return { id: 'CP2608-001' }
  }
  const randomUUID = t.mock.method(globalThis.crypto, 'randomUUID', () => 'upload-123')

  assert.equal(typeof files.uploadQuotePdfFile, 'function')
  await files.uploadQuotePdfFile(apiCall, {
    customerId: 'Z2608-001',
    dealId: 'D2608-001',
    title: 'Kuchynská linka',
    status: 'koncept',
    fileName: 'ponuka.pdf',
    mimeType: 'application/pdf',
    base64: 'cGRm',
  })

  assert.equal(randomUUID.mock.callCount(), 1)
  assert.deepEqual(calls, [{
    action: 'uploadQuotePdf',
    payload: {
      customerId: 'Z2608-001',
      dealId: 'D2608-001',
      title: 'Kuchynská linka',
      status: 'koncept',
      fileName: 'ponuka.pdf',
      mimeType: 'application/pdf',
      base64: 'cGRm',
      clientUploadId: 'upload-123',
    },
  }])
})
