import test from 'node:test'
import assert from 'node:assert/strict'

import {
  calcGrossFromNet,
  calcNetFromGross,
  initialProjectPriceValues,
  isUsableVatRate,
  projectPriceGross,
  projectPriceNet,
  shouldBlockProjectPriceSave,
} from './format.js'

test('project form preserves stored numeric zero', () => {
  assert.deepEqual(initialProjectPriceValues({ price: 0, priceNet: 0 }), { price: 0, priceNet: 0 })
  assert.deepEqual(initialProjectPriceValues({ price: null }), { price: '', priceNet: '' })
})

test('project form derives a coherent zero in both directions', () => {
  assert.equal(calcGrossFromNet('0', 23), '0')
  assert.equal(calcNetFromGross('0', 23), '0')
})

test('isUsableVatRate accepts only finite numeric rates between 0 and 100', () => {
  for (const value of [0.01, 23, 99.99]) assert.equal(isUsableVatRate(value), true)
  for (const value of ['23', 0, 100, -1, NaN, Infinity, null, undefined]) {
    assert.equal(isUsableVatRate(value), false, String(value))
  }
})

test('project prices preserve explicit numeric and string zero', () => {
  assert.equal(projectPriceNet({ priceNet: 0, price: 123 }, 23), 0)
  assert.equal(projectPriceNet({ priceNet: '0', price: 123 }, 23), 0)
  assert.equal(projectPriceGross({ price: 0, priceNet: 100 }, 23), 0)
  assert.equal(projectPriceGross({ price: '0', priceNet: 100 }, 23), 0)
})

test('project prices return zero when both values are missing', () => {
  assert.equal(projectPriceNet({}, 23), 0)
  assert.equal(projectPriceGross({}, 23), 0)
})

test('project prices do not derive the opposite value without a usable VAT rate', () => {
  assert.equal(projectPriceNet({ price: 123 }), null)
  assert.equal(projectPriceNet({ price: 123 }, '23'), null)
  assert.equal(projectPriceGross({ priceNet: 100 }), null)
  assert.equal(projectPriceGross({ priceNet: 100 }, 0), null)
})

test('project prices derive net and gross with the configured VAT rate', () => {
  assert.equal(projectPriceNet({ price: 123 }, 23), 100)
  assert.equal(projectPriceGross({ priceNet: 100 }, 23), 123)
})

test('project price save is blocked only after editing exactly one price without tax config', () => {
  const blocked = (overrides) => shouldBlockProjectPriceSave({
    canUseTaxCalculations: false,
    vatRate: 23,
    pricesTouched: true,
    priceNet: '100',
    price: '',
    ...overrides,
  })
  assert.equal(blocked({ pricesTouched: false }), false)
  assert.equal(blocked({ canUseTaxCalculations: true }), false)
  assert.equal(blocked({ priceNet: '', price: '' }), false)
  assert.equal(blocked({ priceNet: '100', price: '123' }), false)
  assert.equal(blocked({}), true)
  assert.equal(blocked({ priceNet: '', price: '123' }), true)
  assert.equal(blocked({ canUseTaxCalculations: true, vatRate: '23' }), true)
})
