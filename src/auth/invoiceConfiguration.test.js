import test from 'node:test'
import assert from 'node:assert/strict'
import {
  INITIAL_INSTANCE_CONFIGURATION,
  UNAVAILABLE_INSTANCE_CONFIGURATION,
  canCreateInvoiceDocuments,
  canUseTaxCalculations,
  configurationNotice,
  normalizeInvoiceConfiguration,
} from './invoiceConfiguration.js'

const ready = { ready: true, issues: [] }

test('normalizácia rozlíši tax a invoicing bez hodnôt', () => {
  assert.deepEqual(normalizeInvoiceConfiguration({
    tax: ready,
    invoicing: { ready: false, issues: [{ key: 'companyIban', kind: 'missing' }] },
  }), {
    state: 'loaded',
    tax: ready,
    invoicing: { ready: false, issues: [{ key: 'companyIban', kind: 'missing' }] },
  })
})

test('malformed alebo rozporný kontrakt je unavailable', () => {
  for (const raw of [
    {},
    { tax: { ready: true, issues: [{ key: 'vatRate', kind: 'missing' }] }, invoicing: ready },
    { tax: { ready: false, issues: [{ key: 'secret', kind: 'missing' }] }, invoicing: ready },
    { tax: { ready: false, issues: [{ key: 'vatRate', kind: 'other' }] }, invoicing: ready },
    { tax: { ready: false, issues: 'vatRate' }, invoicing: ready },
    { tax: { ready: true, issues: [] }, invoicing: { ready: false, issues: [{ key: 'vatRate', kind: 'missing' }] } },
    { tax: { ready: false, issues: [] }, invoicing: { ready: true, issues: [] } },
    { tax: { ready: false, issues: [{ key: 'vatRate', kind: 'missing' }, { key: 'vatRate', kind: 'invalid' }] }, invoicing: { ready: false, issues: [{ key: 'vatRate', kind: 'missing' }] } },
    { tax: { ready: false, issues: [{ key: 'vatRate', kind: 'missing' }] }, invoicing: { ready: false, issues: [{ key: 'vatRate', kind: 'invalid' }] } },
  ]) assert.deepEqual(normalizeInvoiceConfiguration(raw), UNAVAILABLE_INSTANCE_CONFIGURATION)
})

test('neadmin môže dostať false readiness bez detailu', () => {
  assert.deepEqual(normalizeInvoiceConfiguration({
    tax: ready,
    invoicing: { ready: false, issues: [] },
  }), { state: 'loaded', tax: ready, invoicing: { ready: false, issues: [] } })
})

test('doklady vyžadujú pripravenú daň aj fakturáciu', () => {
  const missingTax = { ready: false, issues: [{ key: 'vatRate', kind: 'missing' }] }
  const missingInvoice = { ready: false, issues: [{ key: 'companyIban', kind: 'missing' }] }
  assert.equal(canUseTaxCalculations({ state: 'loaded', tax: ready, invoicing: missingInvoice }), true)
  assert.equal(canCreateInvoiceDocuments({ state: 'loaded', tax: ready, invoicing: missingInvoice }), false)
  assert.equal(canCreateInvoiceDocuments({ state: 'loaded', tax: missingTax, invoicing: ready }), false)
  assert.equal(canCreateInvoiceDocuments({ state: 'loaded', tax: ready, invoicing: ready }), true)
  for (const state of [INITIAL_INSTANCE_CONFIGURATION, UNAVAILABLE_INSTANCE_CONFIGURATION]) {
    assert.equal(canUseTaxCalculations(state), false)
    assert.equal(canCreateInvoiceDocuments(state), false)
  }
})

test('notice rešpektuje rolu, modul a úroveň detailu', () => {
  const missingTax = normalizeInvoiceConfiguration({
    tax: { ready: false, issues: [{ key: 'vatRate', kind: 'missing' }] },
    invoicing: { ready: false, issues: [{ key: 'vatRate', kind: 'missing' }] },
  })
  const missingInvoice = normalizeInvoiceConfiguration({
    tax: ready,
    invoicing: { ready: false, issues: [{ key: 'companyIban', kind: 'missing' }] },
  })
  assert.equal(configurationNotice({ config: missingTax, moduleEnabled: false, isAdmin: true, canIssue: false })?.showAdminLink, true)
  assert.match(configurationNotice({ config: missingTax, moduleEnabled: true, isAdmin: false, canIssue: true }).message, /správcu/)
  assert.equal(configurationNotice({ config: missingInvoice, moduleEnabled: false, isAdmin: true, canIssue: false }), null)
  assert.equal(configurationNotice({ config: missingInvoice, moduleEnabled: true, isAdmin: false, canIssue: false }), null)
  assert.equal(configurationNotice({ config: missingInvoice, moduleEnabled: true, isAdmin: false, canIssue: true })?.showAdminLink, false)
})

test('loading a unavailable sú fail-closed a majú poctivú správu', () => {
  const audience = { moduleEnabled: true, isAdmin: true, canIssue: true }
  assert.match(configurationNotice({ config: INITIAL_INSTANCE_CONFIGURATION, ...audience }).message, /Overuje/)
  assert.match(configurationNotice({ config: UNAVAILABLE_INSTANCE_CONFIGURATION, ...audience }).message, /nepodarilo overiť/)
  const taxOnlyAudience = { moduleEnabled: false, isAdmin: true, canIssue: false }
  assert.doesNotMatch(configurationNotice({ config: INITIAL_INSTANCE_CONFIGURATION, ...taxOnlyAudience }).message, /faktur/i)
  assert.doesNotMatch(configurationNotice({ config: UNAVAILABLE_INSTANCE_CONFIGURATION, ...taxOnlyAudience }).message, /faktur/i)
})
