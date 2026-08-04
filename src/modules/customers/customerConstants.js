// Číselníky a popisky kartotéky zákazníkov. Patria do JADRA — sú v každej inštancii bez ohľadu
// na to, či má zákazník kúpený modul CRM. Preto sú oddelené od `modules/crm/crmConstants.js`:
// keby zostali v jednom súbore, jadro (CustomersList, CustomerForm, CustomerDetail) by staticky
// ťahalo aj kód CRM (fáza 2b, Úloha C2).

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

export const CONTACT_TYPES = [
  { value: 'hlavny', label: 'Hlavný' },
  { value: 'technicky', label: 'Technický' },
  { value: 'fakturacny', label: 'Fakturačný' },
  { value: 'ine', label: 'Iné' },
]

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

export function contactTypeLabel(code) {
  return CONTACT_TYPES.find(t => t.value === code)?.label || code || '—'
}
