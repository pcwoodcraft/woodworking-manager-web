export const DEAL_PHASES = [
  { value: 'novy_dopyt', label: 'Nový dopyt' },
  { value: 'kvalifikacia', label: 'Kvalifikácia' },
  { value: 'predbezna_ponuka', label: 'Predbežná ponuka' },
  { value: 'obhliadka', label: 'Obhliadka / zameranie' },
  { value: 'navrh_vykres', label: 'Návrh a výkres' },
  { value: 'cenova_ponuka', label: 'Cenová ponuka' },
  { value: 'vyjednavanie', label: 'Vyjednávanie' },
  { value: 'objednavka_zaloha', label: 'Objednávka + záloha' },
  { value: 'vo_vyrobe', label: 'Vo výrobe' },
  { value: 'dodanie', label: 'Dodanie / montáž' },
  { value: 'po_predaj', label: 'Po-predaj' },
]

export const DEAL_STATUSES = [
  { value: 'otvoreny', label: 'Otvorený' },
  { value: 'vyhrate', label: 'Vyhraté' },
  { value: 'prehrate', label: 'Prehrané' },
]

export const DEAL_SOURCES = [
  { value: 'web', label: 'Web' },
  { value: 'telefon', label: 'Telefón' },
  { value: 'email', label: 'E-mail' },
  { value: 'social', label: 'Sociálne siete' },
  { value: 'odporucanie', label: 'Odporúčanie' },
  { value: 'veletrh', label: 'Veľtrh' },
  { value: 'partner', label: 'Partner / architekt' },
  { value: 'ine', label: 'Iné' },
]

export const PRODUCT_TYPES = [
  'schodisko', 'postel', 'dvere', 'stol', 'kuchyna', 'atyp', 'ine',
]

export const CUSTOMER_TYPES = [
  { value: 'sukromna', label: 'Súkromná osoba' },
  { value: 'stolar', label: 'Stolár' },
  { value: 'developer', label: 'Developer' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'architekt', label: 'Architekt' },
  { value: 'studio', label: 'Interiérové štúdio' },
  { value: 'ine', label: 'Iné' },
]

export const CUSTOMER_STATUSES = [
  { value: 'novy', label: 'Nový kontakt' },
  { value: 'potencialny', label: 'Potenciálny' },
  { value: 'v_jednani', label: 'V jednaní' },
  { value: 'aktivny', label: 'Aktívny' },
  { value: 'neaktivny', label: 'Neaktívny' },
]

export const ACTIVITY_TYPES = [
  { value: 'hovor', label: 'Hovor' },
  { value: 'email', label: 'E-mail' },
  { value: 'stretnutie', label: 'Stretnutie' },
  { value: 'obhliadka', label: 'Obhliadka' },
  { value: 'poznamka', label: 'Poznámka' },
]

export const CRM_TASK_PRIORITIES = [
  { value: 'nizka', label: 'Nízka' },
  { value: 'normalna', label: 'Normálna' },
  { value: 'vysoka', label: 'Vysoká' },
]

export function phaseLabel(code) {
  return DEAL_PHASES.find(p => p.value === code)?.label || code || '—'
}

export function dealStatusLabel(code) {
  return DEAL_STATUSES.find(s => s.value === code)?.label || code || '—'
}

export function sourceLabel(code) {
  return DEAL_SOURCES.find(s => s.value === code)?.label || code || '—'
}

export function customerDisplayName(c) {
  if (!c) return '—'
  const person = [c.firstName, c.lastName].filter(Boolean).join(' ').trim()
  return person || c.company || c.id || '—'
}

export function customerTypeLabel(code) {
  return CUSTOMER_TYPES.find(t => t.value === code)?.label || code || '—'
}

export function customerStatusLabel(code) {
  return CUSTOMER_STATUSES.find(s => s.value === code)?.label || code || '—'
}

export const LOST_REASONS = [
  { value: 'cena', label: 'Cena' },
  { value: 'termin', label: 'Termín' },
  { value: 'konkurencia', label: 'Konkurencia' },
  { value: 'nereaguje', label: 'Klient nereaguje' },
  { value: 'nerealny', label: 'Nereálny dopyt' },
  { value: 'ine', label: 'Iné' },
]

export const STALE_DAYS = 7

export const KANBAN_COLUMNS = [
  ...DEAL_PHASES.map(p => ({ kind: 'phase', value: p.value, label: p.label })),
  { kind: 'status', value: 'vyhrate', label: 'Vyhraté' },
  { kind: 'status', value: 'prehrate', label: 'Prehrané' },
]

export function lostReasonLabel(code) {
  return LOST_REASONS.find(r => r.value === code)?.label || code || '—'
}

export const QUOTE_LINK_STATUSES = [
  { value: 'koncept', label: 'Koncept' },
  { value: 'odoslana', label: 'Odoslaná' },
  { value: 'schvalena', label: 'Schválená' },
  { value: 'zamietnuta', label: 'Zamietnutá' },
  { value: 'expirovala', label: 'Expirovala' },
]

export function quoteStatusLabel(code) {
  return QUOTE_LINK_STATUSES.find(s => s.value === code)?.label || code || '—'
}

const CONVERT_MIN_PHASE = 'objednavka_zaloha'

export function canConvertDealToProject(deal) {
  if (!deal || deal.projectId) return false
  const minIdx = DEAL_PHASES.findIndex(p => p.value === CONVERT_MIN_PHASE)
  const curIdx = DEAL_PHASES.findIndex(p => p.value === deal.phase)
  return curIdx >= minIdx && minIdx >= 0
}
