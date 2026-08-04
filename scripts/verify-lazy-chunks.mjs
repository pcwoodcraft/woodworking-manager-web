// scripts/verify-lazy-chunks.mjs
//
// Programová kontrola balíka pre modularizáciu (fáza 2b). Repo nemá testovací framework, takže
// definícia hotového je `npm run lint` + `npm run build` + tento skript s exit 0.
//
// Čo kontroluje:
//  1) hygienu konfigurácie (každý priečinok v src/modules je buď mapovaný na modul, alebo jadrový),
//  2) existenciu súborov, ktoré majú byť lenivé,
//  3) eager uzáveru VŠETKÝCH vstupných bodov buildu (ModuleInfo.isEntry) — nielen App.jsx,
//  4) modulovú čistotu route-lazy cieľov (lazy cieľ modulu X nesmie staticky ťahať modul Y),
//  5) runtime bránu hasModule('modul') pri komponentových dynamických hranách,
//  6) prítomnosť povinných dynamických hrán (vrátane App.jsx -> route),
//  7) štrukturálnu väzbu route -> <RequireModule module="..."> s PRESNE očakávaným module ID.
//
import { build, normalizePath } from 'vite'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve, relative, dirname } from 'node:path'

const root = process.cwd()
// Normalizácia cez Vite normalizePath (POSIX oddeľovače) + orezanie prípadnej query prípony
// (napr. `?raw`) pred akýmkoľvek porovnaním alebo čítaním zo súboru — rieši PLR-F2B-005.
const rel = (id) => normalizePath(relative(root, id)).split('?')[0]
const stripQuery = (id) => id.split('?')[0]
const APP_ENTRY = 'src/App.jsx'

const LAZY_SOURCES = [
  'src/modules/customers/Pipeline.jsx', 'src/modules/customers/CrmToday.jsx',
  'src/modules/customers/CrmOverview.jsx', 'src/modules/customers/QuickDealForm.jsx',
  'src/modules/customers/DealMoveModal.jsx', 'src/modules/customers/LostReasonModal.jsx',
  'src/modules/quotes/QuotesList.jsx', 'src/modules/quotes/QuoteForm.jsx', 'src/modules/quotes/QuoteDetail.jsx',
  'src/modules/quotes/DeleteQuoteModal.jsx', 'src/modules/quotes/QuoteVisualizations.jsx',
  'src/modules/crm/CustomerCrmSections.jsx', 'src/modules/crm/crmConstants.js',
  'src/modules/crm/DealDetailModal.jsx', 'src/modules/crm/ActivityModal.jsx',
  'src/modules/crm/CrmTaskModal.jsx', 'src/modules/crm/ComplaintModal.jsx',
  'src/modules/projects/Projects.jsx', 'src/modules/projects/ProjectDetail.jsx',
  'src/modules/projects/ConvertToProjectModal.jsx', 'src/modules/projects/ProjectEvaluationSection.jsx',
  'src/modules/invoices/Invoices.jsx', 'src/modules/invoices/CreateIssuedInvoiceForm.jsx',
  'src/modules/invoices/InvoicePaymentModal.jsx', 'src/modules/costs/Costs.jsx',
  'src/modules/stats/PricingStats.jsx',
  'src/modules/social/SocialPostsPage.jsx', 'src/modules/social/SocialPostDetail.jsx',
  'src/modules/employees/Employees.jsx', 'src/modules/workshop/Workshop.jsx', 'src/modules/atelier/AtelierPage.jsx',
]

// Povinné dynamické hrany. Komponentové hrany (C0/C2) + VŠETKY route hrany z App.jsx (C1).
// Route hrany tu musia byť: bez nich by odstránený alebo staticky nahradený route loader
// nemusel byť zachytený (nález PLR-F2B-007).
const POVINNE_HRANY = [
  ['src/modules/customers/CustomerDetail.jsx', 'src/modules/crm/CustomerCrmSections.jsx'],
  ['src/modules/projects/ProjectDetail.jsx', 'src/modules/invoices/CreateIssuedInvoiceForm.jsx'],
  ['src/modules/projects/ProjectDetail.jsx', 'src/modules/invoices/InvoicePaymentModal.jsx'],
  ['src/modules/quotes/QuoteDetail.jsx', 'src/modules/projects/ConvertToProjectModal.jsx'],
  ['src/modules/crm/DealDetailModal.jsx', 'src/modules/projects/ConvertToProjectModal.jsx'],
  ['src/modules/crm/DealDetailModal.jsx', 'src/modules/projects/ProjectEvaluationSection.jsx'],
  // Route hrany (Úloha C1) — jadro (Dashboard, Admin, CustomersLayout, CustomersList,
  // CustomerDetail, CustomerForm, SalesOwnerSelect) zámerne NIE je lenivé.
  [APP_ENTRY, 'src/modules/customers/QuickDealForm.jsx'],
  [APP_ENTRY, 'src/modules/customers/Pipeline.jsx'],
  [APP_ENTRY, 'src/modules/customers/CrmToday.jsx'],
  [APP_ENTRY, 'src/modules/customers/CrmOverview.jsx'],
  [APP_ENTRY, 'src/modules/quotes/QuotesList.jsx'],
  [APP_ENTRY, 'src/modules/quotes/QuoteForm.jsx'],
  [APP_ENTRY, 'src/modules/quotes/QuoteDetail.jsx'],
  [APP_ENTRY, 'src/modules/atelier/AtelierPage.jsx'],
  [APP_ENTRY, 'src/modules/projects/Projects.jsx'],
  [APP_ENTRY, 'src/modules/projects/ProjectDetail.jsx'],
  [APP_ENTRY, 'src/modules/workshop/Workshop.jsx'],
  [APP_ENTRY, 'src/modules/invoices/Invoices.jsx'],
  [APP_ENTRY, 'src/modules/costs/Costs.jsx'],
  [APP_ENTRY, 'src/modules/stats/PricingStats.jsx'],
  [APP_ENTRY, 'src/modules/social/SocialPostsPage.jsx'],
  [APP_ENTRY, 'src/modules/social/SocialPostDetail.jsx'],
  [APP_ENTRY, 'src/modules/employees/Employees.jsx'],
]

const DIR_TO_MODULE = {
  'src/modules/crm': 'crm',
  'src/modules/quotes': 'quotes',
  'src/modules/atelier': 'quotes',
  'src/modules/projects': 'projects',
  'src/modules/invoices': 'invoicing',
  'src/modules/costs': 'finance',
  'src/modules/stats': 'stats',
  'src/modules/social': 'marketing',
  'src/modules/employees': 'employees',
  'src/modules/workshop': 'workshop',
}
const CRM_FILES_IN_CUSTOMERS = new Set([
  'src/modules/customers/Pipeline.jsx', 'src/modules/customers/CrmToday.jsx',
  'src/modules/customers/CrmOverview.jsx', 'src/modules/customers/QuickDealForm.jsx',
  'src/modules/customers/DealMoveModal.jsx', 'src/modules/customers/LostReasonModal.jsx',
])
const CORE_DIRS = ['customers', 'dashboard', 'admin']

function ownerModuleOf(absId) {
  const r = rel(absId)
  if (CRM_FILES_IN_CUSTOMERS.has(r)) return 'crm'
  if (r.startsWith('src/shared/')) return null
  for (const [dir, mod] of Object.entries(DIR_TO_MODULE)) {
    if (r.startsWith(dir + '/')) return mod
  }
  return null
}

let fail = false
const errors = []

for (const d of readdirSync(resolve(root, 'src/modules'), { withFileTypes: true })) {
  if (!d.isDirectory()) continue
  const key = 'src/modules/' + d.name
  if (!(key in DIR_TO_MODULE) && !CORE_DIRS.includes(d.name)) {
    errors.push(`FAIL: priečinok ${key} nie je v DIR_TO_MODULE ani medzi jadrovými (${CORE_DIRS.join(', ')}).`)
    fail = true
  }
}

for (const src of LAZY_SOURCES) {
  if (!existsSync(resolve(root, src))) { errors.push(`FAIL: LAZY_SOURCES obsahuje neexistujúci súbor ${src}.`); fail = true }
}
// Pozn.: existencia na disku NIE JE dôkaz, že súbor nie je v eager uzávere vstupu — ten dôkaz
// dáva až entry static-closure kontrola nižšie (bod 4).

const dynEdgesRaw = []
const staticEdges = new Map()
const entryIds = []
let moduleCount = 0

await build({
  root,
  configFile: resolve(root, 'vite.config.js'),
  logLevel: 'silent',
  build: { write: false, minify: false, reportCompressedSize: false },
  plugins: [{
    name: 'verify-lazy-chunks-audit',
    buildEnd() {
      for (const id of this.getModuleIds()) {
        const info = this.getModuleInfo(id)
        if (!info || id.includes('\0')) continue
        moduleCount++
        if (info.isEntry) entryIds.push(id)
        staticEdges.set(id, info.importedIds || [])
        for (const toId of info.dynamicallyImportedIds || []) dynEdgesRaw.push({ fromId: id, toId })
      }
    },
  }],
})

if (moduleCount === 0) { errors.push('FAIL: buildEnd nenašiel žiadny modul — over getModuleIds()/getModuleInfo() proti nainštalovanej verzii vite/rolldown.'); fail = true }

// BFS nad STATICKÝM grafom (info.importedIds).
function reachableOwners(startId) {
  const seen = new Set(); const stack = [startId]; const owners = new Set()
  while (stack.length) {
    const id = stack.pop()
    if (seen.has(id)) continue
    seen.add(id)
    const o = ownerModuleOf(id)
    if (o) owners.add(o)
    for (const next of staticEdges.get(id) || []) stack.push(next)
  }
  return owners
}

// Ako reachableOwners, ale pre každý nájdený modul si pamätá aj najkratšiu statickú cestu —
// bez nej je hláška o eager úniku nepoužiteľná na diagnostiku.
function reachableOwnerPaths(startId) {
  const seen = new Set([startId])
  const queue = [startId]
  const parent = new Map()
  const found = new Map()
  while (queue.length) {
    const id = queue.shift()
    const o = ownerModuleOf(id)
    if (o && !found.has(o)) {
      const chain = []
      for (let cur = id; cur !== undefined; cur = parent.get(cur)) chain.unshift(rel(cur))
      found.set(o, chain.join(' -> '))
    }
    for (const next of staticEdges.get(id) || []) {
      if (seen.has(next)) continue
      seen.add(next)
      parent.set(next, id)
      queue.push(next)
    }
  }
  return found
}

// 4) Eager uzáver KAŽDÉHO vstupného bodu (rieši PLR-F2B-007). dynEdgesRaw/reachableOwners
// kontrolujú len subgraf POD dynamickými cieľmi — nikdy vlastnú statickú uzáveru vstupu. Ak
// niekto route vráti z lazy() na statický import (v App.jsx alebo v main.jsx / inej entry vetve),
// edge zmizne z dynEdgesRaw a nič by to nezachytilo.
// Zdrojom entry bodov je ModuleInfo.isEntry, nie napevno App.jsx — inak by statický import
// modulu z main.jsx prešiel bez chyby.
// Bez vlastnej manualChunks konfigurácie (over vite.config.js) je statická dosiahnuteľnosť z
// entry bodu spoľahlivým zástupcom za "skončí v eager vstupnom balíku" — Rolldown/Rollup dáva do
// samostatného async chunku len to, čo je dosiahnuteľné VÝHRADNE cez dynamický import.
if (!entryIds.length) {
  errors.push('FAIL: nenašiel sa ani jeden entry modul (ModuleInfo.isEntry) — zmenilo sa API vite/rolldown.')
  fail = true
}
// Poistka proti tichej strate hlavnej vetvy: App.jsx musí byť staticky dosiahnuteľný z niektorého entry.
const appEntryId = [...staticEdges.keys()].find((id) => rel(id) === APP_ENTRY)
if (!appEntryId) {
  errors.push(`FAIL: ${APP_ENTRY} sa nenašiel v zozbieranom modulovom grafe — over vstupný bod buildu.`)
  fail = true
}
for (const entryId of entryIds) {
  for (const [owner, cesta] of reachableOwnerPaths(entryId)) {
    errors.push(`FAIL: ${rel(entryId)} (eager vstup) staticky ťahá modul '${owner}' — skontroluj, či niektorá route/import nestratila lazy(). Cesta: ${cesta}`)
    fail = true
  }
}

// Brána ako dôkaz LEN pre danú hranu (rieši zvyšok PLR-F2B-003).
// Rozklad najbližšej JSX-podmienky na AND-reťazec top-level operandov; každý operand je buď
// doslovný `hasModule('modul')`, alebo identifikátor, ktorého `const`/`let` deklarácia je SAMA
// čistý AND-reťazec s `hasModule('modul')` (rekurzívne). Čokoľvek s `||`, `??`, ternárou alebo
// negáciou na najvyššej úrovni sa fail-closed odmietne (nepovažuje sa za dôkaz).
function nearestEnclosingGuard(source, tagIndex) {
  let depth = 0
  for (let i = tagIndex - 1; i >= 0; i--) {
    const ch = source[i]
    if (ch === '}') depth++
    else if (ch === '{') {
      if (depth === 0) return source.slice(i + 1, tagIndex)
      depth--
    }
  }
  return ''
}
function hasUnsafeLogic(expr) {
  const noOptionalChain = expr.replace(/\?\./g, '')
  const hasTernary = noOptionalChain.includes('?') && noOptionalChain.includes(':')
  const hasOrLike = expr.includes('||') || expr.includes('??')
  const hasNegation = /(^|[^!=])!(?!=)/.test(expr.replace(/!==|!=/g, ''))
  return hasTernary || hasOrLike || hasNegation
}
function topLevelAndOperands(rawExpr) {
  // JSX-podmienka pred tagom môže obsahovať aj ďalšiu vnorenú JSX značku (napr. `<Suspense
  // fallback={...}>` obaľujúci lenivý komponent) — tá vždy začína `<` a chronologicky nasleduje AŽ
  // PO poslednom logickom operátore podmienky v tomto repe (žiadny gate tu nepoužíva `<` ako
  // porovnávací operátor). Orež na prvý `<`, aby zvyšná JSX značka nekontaminovala rozklad na AND.
  const expr = rawExpr.split('<')[0]
  if (hasUnsafeLogic(expr)) return null
  return expr.split('&&').map((s) => s.trim()).filter(Boolean)
}
function resolvesToModuleGate(operand, moduleName, source, seen = new Set()) {
  if (operand === `hasModule('${moduleName}')`) return true
  if (!/^[A-Za-z_$][\w$]*$/.test(operand)) return false
  if (seen.has(operand)) return false
  seen.add(operand)
  const m = source.match(new RegExp(`\\b(?:const|let)\\s+${operand}\\s*=\\s*([^\\n;]+)`))
  if (!m) return false
  const operands = topLevelAndOperands(m[1].trim())
  if (!operands) return false
  return operands.some((op) => resolvesToModuleGate(op, moduleName, source, seen))
}
function gatedForComponent(source, componentName, moduleName) {
  const re = new RegExp(`<${componentName}(?=[\\s/>])`, 'g')
  const occurrences = [...source.matchAll(re)]
  if (occurrences.length === 0) return false
  return occurrences.every((m) => {
    const operands = topLevelAndOperands(nearestEnclosingGuard(source, m.index))
    if (!operands) return false
    return operands.some((op) => resolvesToModuleGate(op, moduleName, source))
  })
}

const videneHrany = new Set()
for (const { fromId, toId } of dynEdgesRaw) {
  videneHrany.add(rel(fromId) + ' -> ' + rel(toId))
  const fromOwner = ownerModuleOf(fromId)
  const toOwners = reachableOwners(toId)
  const cielVlastnik = ownerModuleOf(toId)

  if (rel(fromId) === APP_ENTRY) {
    for (const cieL of toOwners) {
      if (cieL !== cielVlastnik) {
        errors.push(`FAIL: route lazy ${rel(toId)} (modul ${cielVlastnik}) ťahá vo svojej uzávere modul '${cieL}'.`)
        fail = true
      }
    }
  } else {
    const zdroj = readFileSync(stripQuery(fromId), 'utf8')
    const componentName = rel(toId).split('/').pop().replace(/\.jsx?$/, '')
    for (const cieL of toOwners) {
      if (fromOwner === cieL) continue
      if (!gatedForComponent(zdroj, componentName, cieL)) {
        errors.push(`FAIL: ${rel(fromId)} dynamicky načítava modul '${cieL}' bez brány hasModule('${cieL}') pri vykreslení <${componentName}>.`)
        fail = true
      }
    }
  }
}

for (const [from, to] of POVINNE_HRANY) {
  if (!videneHrany.has(from + ' -> ' + to)) { errors.push(`FAIL: očakávaná dynamická hrana ${from} -> ${to} v builde nie je.`); fail = true }
}

// ---------------------------------------------------------------------------
// 7) Štrukturálna väzba route -> jej RequireModule brána (rieši PLR-F2B-003).
//
// Kontrola route hrán vyššie overuje len modulovú čistotu lazy cieľa. Neoverí, že konkrétny route
// element je obalený SPRÁVNYM <RequireModule module="...">. Hľadanie literálu v celom súbore na to
// nestačí — ten istý literál pri inej route by zakryl odstránenú bránu. Preto skutočný štrukturálny
// rozbor: mini-skener JSX, ktorý pre každý výskyt <Binding> zistí zásobník obaľujúcich elementov.
//
// Skener je zámerne jednoduchý (žiadny parser ako závislosť — repo nesmie pribrať npm balík).
// Známe obmedzenia, obe dnes v App.jsx neaktuálne a obe fail-closed (prejavia sa ako FAIL
// „chýbajúca brána", nie ako tiché PASS):
//  - `<` nasledované písmenom sa vždy považuje za začiatok JSX značky; číselné porovnanie
//    `a < b` priamo v JSX by zásobník pokazilo,
//  - apostrof/úvodzovka sa vždy považuje za začiatok reťazca, aj v JSX texte; slovenský text
//    s apostrofom by skener nechal „zjesť" kus súboru.
// NEjde o rozbor jedného riadku route definície — zásobník obaľujúcich elementov drží aj cez
// viacriadkové route definície, takže rozbitie route na viac riadkov kontrolu neobíde.
function scanJsxElements(src) {
  const stack = []            // otvorené elementy (obaľujúci kontext)
  const found = []            // {name, attrs, ancestors}
  const modes = [{ kind: 'text', depth: 0 }]
  const headerTags = []
  const n = src.length
  let i = 0
  const skipString = (q, from) => {
    for (let j = from + 1; j < n; j++) {
      if (src[j] === '\\') { j++; continue }
      if (src[j] === q) return j + 1
    }
    return n
  }
  while (i < n) {
    const mode = modes[modes.length - 1]
    const ch = src[i]
    if (ch === '"' || ch === "'" || ch === '`') { i = skipString(ch, i); continue }
    if (ch === '/' && src[i + 1] === '/') { const j = src.indexOf('\n', i); i = j < 0 ? n : j + 1; continue }
    if (ch === '/' && src[i + 1] === '*') { const j = src.indexOf('*/', i); i = j < 0 ? n : j + 2; continue }

    if (mode.kind === 'text') {
      if (ch === '<' && src[i + 1] === '/') {
        const m = /^<\/\s*([A-Za-z][\w.]*)?\s*>/.exec(src.slice(i))
        if (m) { if (m[1]) stack.pop(); i += m[0].length; continue }
        i++; continue
      }
      if (ch === '<' && /[A-Za-z]/.test(src[i + 1] || '')) {
        const m = /^<([A-Za-z][\w.]*)/.exec(src.slice(i))
        headerTags.push({ name: m[1], attrStart: i + m[0].length })
        modes.push({ kind: 'header' })
        i += m[0].length
        continue
      }
      if (ch === '{') { mode.depth++; i++; continue }
      if (ch === '}') {
        if (mode.depth > 0) mode.depth--
        else if (modes.length > 1) modes.pop()   // koniec `{ … }` výrazu vnútri hlavičky značky
        i++; continue
      }
      i++; continue
    }

    // mode.kind === 'header' — vnútri `<Tag …` až po `>` alebo `/>`
    if (ch === '{') { modes.push({ kind: 'text', depth: 0 }); i++; continue }
    if (ch === '/' && src[i + 1] === '>') {
      const tag = headerTags.pop()
      found.push({ name: tag.name, attrs: src.slice(tag.attrStart, i), ancestors: stack.slice() })
      modes.pop(); i += 2; continue
    }
    if (ch === '>') {
      const tag = headerTags.pop()
      const el = { name: tag.name, attrs: src.slice(tag.attrStart, i) }
      found.push({ ...el, ancestors: stack.slice() })
      stack.push(el)
      modes.pop(); i++; continue
    }
    i++
  }
  return found
}

function lazyBindingsFromApp(source, appAbsPath) {
  const re = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\)\s*\)/g
  const out = []
  for (const m of source.matchAll(re)) {
    const base = resolve(dirname(appAbsPath), m[2])
    const cand = [base, base + '.jsx', base + '.js', base + '/index.jsx', base + '/index.js'].find(existsSync)
    out.push([m[1], cand || base])
  }
  return out
}

const appAbs = resolve(root, APP_ENTRY)
if (existsSync(appAbs)) {
  const appSrc = readFileSync(appAbs, 'utf8')
  const elements = scanJsxElements(appSrc)
  const bindings = lazyBindingsFromApp(appSrc, appAbs)
  for (const [binding, cielAbs] of bindings) {
    const ocakavany = ownerModuleOf(cielAbs)
    if (!ocakavany) continue // jadro — nebráni sa
    const vyskyty = elements.filter((e) => e.name === binding)
    if (!vyskyty.length) {
      errors.push(`FAIL: lazy binding ${binding} (modul ${ocakavany}) sa v JSX ${APP_ENTRY} vôbec nevykresľuje — mŕtvy import alebo skener značiek zlyhal.`)
      fail = true
      continue
    }
    const chybne = vyskyty.filter((e) => !e.ancestors.some(
      (a) => a.name === 'RequireModule' && new RegExp(`module\\s*=\\s*["']${ocakavany}["']`).test(a.attrs),
    ))
    if (chybne.length) {
      errors.push(`FAIL: route ${binding} (modul ${ocakavany}) nie je obalená RequireModule module="${ocakavany}".`)
      fail = true
    }
  }
}

for (const e of errors) console.error(e)
if (!fail) console.log('OK: route lazy ciele sú modulovo čisté, vstupné body nemajú eager únik a komponentové hrany majú brány.')
process.exit(fail ? 1 : 0)
