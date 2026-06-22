// Formátovanie: dátumy D.M.YYYY, sumy 1 234,56 €

export function toIsoDate(d) {
  if (!d) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.substring(0, 10)
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  // lokálne zložky (nie toISOString) — inak polnočný dátum z iného formátu
  // preskočí cez UTC o deň späť
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fmtDate(d) {
  const iso = toIsoDate(d)
  if (!iso) return '—'
  const dt = new Date(iso + 'T12:00:00')
  return dt.getDate() + '.' + (dt.getMonth() + 1) + '.' + dt.getFullYear()
}

export function fmtMoney(v) {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'))
  if (isNaN(n)) return '—'
  return n.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export function parseNum(v) {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

const DEFAULT_VAT_RATE = 23

/** Cena zákazky bez DPH — primárna hodnota pre zoznamy a prehľady. */
export function projectPriceNet(project, vatRate = DEFAULT_VAT_RATE) {
  if (project?.priceNet !== '' && project?.priceNet != null && !isNaN(parseNum(project.priceNet))) {
    return parseNum(project.priceNet)
  }
  const gross = parseNum(project?.price)
  if (gross <= 0) return 0
  return Math.round(gross / (1 + vatRate / 100) * 100) / 100
}

/** Cena zákazky s DPH — len pre detail projektu. */
export function projectPriceGross(project, vatRate = DEFAULT_VAT_RATE) {
  if (project?.price !== '' && project?.price != null && !isNaN(parseNum(project.price))) {
    return parseNum(project.price)
  }
  const net = parseNum(project?.priceNet)
  if (net <= 0) return 0
  return Math.round(net * (1 + vatRate / 100) * 100) / 100
}

// Stavy projektov: kód v tabuľke -> text v rozhraní.
// Staré hodnoty (Aktívny/Dokončený/Zrušený) sa zobrazujú správne až do migrácie.
export const PROJECT_STATUSES = [
  { value: 'priprava', label: 'Príprava' },
  { value: 'vyroba', label: 'Výroba' },
  { value: 'montaz', label: 'Montáž' },
  { value: 'odovzdany', label: 'Odovzdaný' },
  { value: 'zruseny', label: 'Zrušený' },
]

const LEGACY_STATUS = {
  'Aktívny': 'vyroba',
  'Dokončený': 'odovzdany',
  'Zrušený': 'zruseny',
  'uzavrety': 'odovzdany',
}

export function normalizeStatus(s) {
  if (LEGACY_STATUS[s]) return LEGACY_STATUS[s]
  return PROJECT_STATUSES.some(x => x.value === s) ? s : 'vyroba'
}

export function statusLabel(s) {
  const norm = normalizeStatus(s)
  return PROJECT_STATUSES.find(x => x.value === norm)?.label ?? s
}

// Bežiaci projekt = nie je odovzdaný ani zrušený (legacy uzavrety tiež nie)
export function isRunningStatus(s) {
  const norm = normalizeStatus(s)
  return norm !== 'odovzdany' && norm !== 'zruseny'
}

// Úroveň varovania rozpočtu (90 % / 100 % pravidlo)
export function budgetLevel(costPercent) {
  if (costPercent == null || isNaN(costPercent)) return 'none'
  if (costPercent >= 100) return 'over'
  if (costPercent >= 90) return 'warn'
  return 'ok'
}

export function fmtPercent(v) {
  if (v == null || isNaN(v)) return '—'
  return v.toLocaleString('sk-SK', { maximumFractionDigits: 1 }) + ' %'
}

export function priorityLabel(priority) {
  const n = parseInt(priority, 10)
  if (n === 1) return 'Vysoká'
  if (n === 2) return 'Stredná'
  if (n === 3) return 'Nízka'
  return '—'
}

export function prioritySortKey(priority) {
  const n = parseInt(priority, 10)
  return (n >= 1 && n <= 3) ? n : 9
}

export function sortProjectsForSchedule(a, b) {
  const pd = prioritySortKey(a.priority) - prioritySortKey(b.priority)
  if (pd !== 0) return pd
  return (toIsoDate(a.deadline) || '9999').localeCompare(toIsoDate(b.deadline) || '9999')
}

// ── Mesiace (formát v tabuľke: 'RRRR-MM') ──────────────────

const MONTH_NAMES = ['január', 'február', 'marec', 'apríl', 'máj', 'jún',
  'júl', 'august', 'september', 'október', 'november', 'december']

export function thisMonth() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}

export function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}

export function fmtMonth(ym) {
  if (!ym || !/^\d{4}-\d{2}/.test(ym)) return ym || '—'
  const [y, m] = ym.split('-')
  return MONTH_NAMES[Number(m) - 1] + ' ' + y
}

// Rozhodujúci dátum faktúry pre zaradenie do mesiaca (splatnosť, inak vystavenie)
export function invoiceMonth(inv) {
  return (toIsoDate(inv.dueDate) || toIsoDate(inv.issueDate) || '').substring(0, 7)
}
