// Stavy cenovej ponuky a ich popisky. Jediné konečné miesto definície — modul `quotes`
// (`quoteConstants.js`) ich re-exportuje kvôli spätnej kompatibilite, CRM (detail dopytu) ich
// importuje priamo odtiaľto, aby CRM staticky neťahalo kód modulu ponúk (fáza 2b, Úloha C0).
//
// Pozor na zámenu: `crm/crmConstants.js` má vlastný, rovnako pomenovaný deprecated
// `quoteStatusLabel` — ten je alias na `quoteLinkStatusLabel` pre staré externé odkazy na ponuky
// a s týmto súborom nesúvisí.
export const QUOTE_STATUSES = [
  { value: 'koncept', label: 'Koncept' },
  { value: 'odoslana', label: 'Odoslaná' },
  { value: 'prijata', label: 'Prijatá' },
  { value: 'zamietnuta', label: 'Zamietnutá' },
  { value: 'zrusena', label: 'Zrušená' },
]

export function quoteStatusLabel(status) {
  return QUOTE_STATUSES.find(s => s.value === status)?.label || status || '—'
}
