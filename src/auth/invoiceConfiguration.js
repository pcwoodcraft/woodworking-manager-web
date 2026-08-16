const TAX_KEYS = new Set(['companyTaxRegime', 'vatRate'])
const INVOICING_KEYS = new Set([
  'companyTaxRegime', 'companyName', 'companyAddress', 'companyIco', 'companyDic',
  'companyIcDph', 'companyIban', 'invoiceNextSeq', 'advanceNextSeq',
  'creditNoteNextSeq', 'invoiceSeqDigits', 'advancePercent', 'vatRate', 'paymentDays',
])
const ISSUE_KINDS = new Set(['missing', 'invalid'])

const emptyScope = () => ({ ready: false, issues: [] })

export const INITIAL_INSTANCE_CONFIGURATION = Object.freeze({
  state: 'loading',
  tax: Object.freeze(emptyScope()),
  invoicing: Object.freeze(emptyScope()),
})

export const UNAVAILABLE_INSTANCE_CONFIGURATION = Object.freeze({
  state: 'unavailable',
  tax: Object.freeze(emptyScope()),
  invoicing: Object.freeze(emptyScope()),
})

function normalizeScope(scope, allowedKeys) {
  if (!scope || typeof scope !== 'object' || typeof scope.ready !== 'boolean' || !Array.isArray(scope.issues)) return null
  const issues = []
  for (const issue of scope.issues) {
    if (!issue || typeof issue !== 'object' || !allowedKeys.has(issue.key) || !ISSUE_KINDS.has(issue.kind)) return null
    issues.push({ key: issue.key, kind: issue.kind })
  }
  if (scope.ready && issues.length) return null
  return { ready: scope.ready, issues }
}

export function normalizeInvoiceConfiguration(data) {
  if (!data || typeof data !== 'object') return UNAVAILABLE_INSTANCE_CONFIGURATION
  const tax = normalizeScope(data.tax, TAX_KEYS)
  const invoicing = normalizeScope(data.invoicing, INVOICING_KEYS)
  return tax && invoicing ? { state: 'loaded', tax, invoicing } : UNAVAILABLE_INSTANCE_CONFIGURATION
}

export const canUseTaxCalculations = (config) =>
  config?.state === 'loaded' && config.tax?.ready === true

export const canCreateInvoiceDocuments = (config) =>
  canUseTaxCalculations(config) && config.invoicing?.ready === true

const LABELS = {
  companyTaxRegime: 'Daňový režim',
  companyName: 'Názov firmy',
  companyAddress: 'Adresa',
  companyIco: 'IČO',
  companyDic: 'DIČ',
  companyIcDph: 'IČ DPH',
  companyIban: 'IBAN',
  invoiceNextSeq: 'Rad F',
  advanceNextSeq: 'Rad Z',
  creditNoteNextSeq: 'Rad D',
  invoiceSeqDigits: 'Počet číslic radu',
  advancePercent: 'Percento zálohy',
  vatRate: 'Sadzba DPH',
  paymentDays: 'Splatnosť',
}

function adminDetails(config, includeInvoice) {
  const issues = [...config.tax.issues, ...(includeInvoice ? config.invoicing.issues : [])]
  return [...new Map(issues.map(issue => [issue.key, `${LABELS[issue.key]}: ${issue.kind === 'missing' ? 'chýba' : 'neplatná hodnota'}`])).values()].join(', ')
}

export function configurationNotice({ config, moduleEnabled, isAdmin, canIssue }) {
  const invoiceAudience = moduleEnabled === true && (isAdmin === true || canIssue === true)
  if (!isAdmin && !invoiceAudience) return null
  if (config?.state === 'loading') {
    return { title: 'Overuje sa konfigurácia', message: 'Overuje sa pripravenosť fakturácie.', showAdminLink: false }
  }
  if (config?.state !== 'loaded') {
    return {
      title: 'Konfiguráciu sa nepodarilo overiť',
      message: 'Konfiguráciu sa nepodarilo overiť. Daňové a fakturačné operácie zostávajú z bezpečnostných dôvodov zablokované.',
      showAdminLink: isAdmin === true,
    }
  }
  const taxBlocked = !config.tax.ready
  const invoicingBlocked = invoiceAudience && !config.invoicing.ready
  if (!taxBlocked && !invoicingBlocked) return null
  const detail = isAdmin ? adminDetails(config, invoicingBlocked) : ''
  return {
    title: 'Fakturácia nie je nakonfigurovaná',
    message: detail
      ? `Skontrolujte tieto nastavenia: ${detail}.`
      : 'Fakturácia nie je pripravená. Kontaktujte správcu.',
    showAdminLink: isAdmin === true,
  }
}
