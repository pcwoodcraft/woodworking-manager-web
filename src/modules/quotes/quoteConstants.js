export const QUOTE_STATUSES = [
  { value: 'koncept', label: 'Koncept' },
  { value: 'odoslana', label: 'Odoslaná' },
  { value: 'prijata', label: 'Prijatá' },
  { value: 'zamietnuta', label: 'Zamietnutá' },
  { value: 'zrusena', label: 'Zrušená' },
]

export const QUOTE_LANGUAGES = [
  { value: 'SK', label: 'Slovenčina' },
  { value: 'SK_DE', label: 'SK + nemčina' },
  { value: 'SK_EN', label: 'SK + angličtina' },
]

export const QUOTE_TAX_MODES = [
  { value: 'VAT_SK', label: 'S DPH (SK)' },
  { value: 'REVERSE_CHARGE', label: 'Bez DPH (reverse charge)' },
]

export const QUOTE_TERMS_TEMPLATES = [
  { value: 'kratka', label: 'Krátke podmienky' },
  { value: 'plna', label: 'Plné podmienky' },
]

export const QUOTE_UNITS = ['ks', 'm', 'm²', 'bm', 'hod']

export function quoteStatusLabel(status) {
  return QUOTE_STATUSES.find(s => s.value === status)?.label || status || '—'
}

export function quoteTaxModeLabel(mode) {
  return QUOTE_TAX_MODES.find(m => m.value === mode)?.label || mode || '—'
}

export function translateTargetLang(language) {
  if (language === 'SK_DE') return 'DE'
  if (language === 'SK_EN') return 'EN'
  return null
}

export const emptyQuoteItem = () => ({
  descPrimary: '',
  descSecondary: '',
  descDetail: '',
  quantity: '',
  unit: 'ks',
  unitPriceNet: '',
  linePriceNet: '',
})
