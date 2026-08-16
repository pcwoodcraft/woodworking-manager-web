export const INVOICE_FIELDS = [
  { key: 'companyName', label: 'Názov firmy', span: 2 },
  { key: 'companyTagline', label: 'Podnadpis (tagline)', span: 2 },
  { key: 'companyAddress', label: 'Adresa', span: 2, rows: 2 },
  { key: 'companyIco', label: 'IČO' },
  { key: 'companyDic', label: 'DIČ' },
  { key: 'companyIcDph', label: 'IČ DPH' },
  { key: 'companyIban', label: 'IBAN', span: 2 },
  { key: 'companyBank', label: 'Banka', span: 2 },
  { key: 'companySwift', label: 'SWIFT' },
  { key: 'companyPhone', label: 'Telefón' },
  { key: 'companyEmail', label: 'E-mail' },
  { key: 'invoiceConstantSymbol', label: 'Konštantný symbol' },
  { key: 'invoiceIssuedBy', label: 'Vyhotovil' },
  { key: 'paymentDays', label: 'Splatnosť (dní)' },
  { key: 'advancePercent', label: 'Záloha (% z ceny projektu)' },
  { key: 'invoiceNextSeq', label: 'Ďalšie číslo — rad F (ostrá faktúra)' },
  { key: 'advanceNextSeq', label: 'Ďalšie číslo — rad Z (záloha)' },
  { key: 'creditNoteNextSeq', label: 'Ďalšie číslo — rad D (storno/dobropis)' },
  { key: 'invoiceSeqDigits', label: 'Počet číslic v sekvencii' },
  { key: 'invoiceFooter', label: 'Pätička faktúry', span: 2, rows: 2 },
]

export const INVOICE_SETTING_KEYS = INVOICE_FIELDS.map(field => field.key)

export function projectInvoiceSettings(raw = {}) {
  return Object.fromEntries(INVOICE_SETTING_KEYS.map(key => [key, raw?.[key] ?? '']))
}

export const canLoadInvoiceSettings = ({ moduleEnabled, canRead }) =>
  moduleEnabled === true && canRead === true
