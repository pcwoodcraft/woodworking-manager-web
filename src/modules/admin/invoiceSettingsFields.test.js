import test from 'node:test'
import assert from 'node:assert/strict'
import {
  INVOICE_SETTING_KEYS,
  canLoadInvoiceSettings,
  requireSettingsProjection,
  projectInvoiceSettings,
} from './invoiceSettingsFields.js'

test('projekcia zachová iba polia fakturačného panela', () => {
  const projected = projectInvoiceSettings({
    companyName: 'Firma',
    companyPhone: '+421',
    creditNoteNextSeq: '7',
    companyTaxRegime: 'sk_vat_payer',
    vatRate: '23',
    injected: 'nesmie odísť',
  })
  assert.equal(projected.companyName, 'Firma')
  assert.equal(projected.companyPhone, '+421')
  assert.equal(projected.creditNoteNextSeq, '7')
  assert.equal(projected.companyEmail, '')
  assert.equal(Object.hasOwn(projected, 'companyTaxRegime'), false)
  assert.equal(Object.hasOwn(projected, 'vatRate'), false)
  assert.equal(Object.hasOwn(projected, 'injected'), false)
  assert.deepEqual(Object.keys(projected), INVOICE_SETTING_KEYS)
  assert.equal(INVOICE_SETTING_KEYS.length, 20)
})

test('invoice settings sa načítajú iba pri module aj read práve', () => {
  assert.equal(canLoadInvoiceSettings({ moduleEnabled: true, canRead: true }), true)
  assert.equal(canLoadInvoiceSettings({ moduleEnabled: false, canRead: true }), false)
  assert.equal(canLoadInvoiceSettings({ moduleEnabled: true, canRead: false }), false)
  assert.equal(canLoadInvoiceSettings({ moduleEnabled: false, canRead: false }), false)
})

test('read projekcia odmietne malformed alebo neúplný HTTP 200 envelope', () => {
  assert.throws(() => requireSettingsProjection(undefined, ['a']))
  assert.throws(() => requireSettingsProjection([], ['a']))
  assert.throws(() => requireSettingsProjection({}, ['a']))
  assert.throws(() => requireSettingsProjection({ a: 'x' }, ['a', 'b']))
  assert.deepEqual(requireSettingsProjection({ a: 'x', b: '', injected: 'nie' }, ['a', 'b']), { a: 'x', b: '' })
})
