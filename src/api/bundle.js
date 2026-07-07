// Načítanie bundle akcií (blok V3) — jedna obrazovka = jeden request.
//
// Kontrakt sekcie: { status: 'ok' | 'denied' | 'error', data, error? }
// - denied  -> widget sa skryje (používateľ bez práva sekciu nevidí)
// - error   -> widget zobrazí chybový stav, zvyšok obrazovky funguje
//
// Starnutie práv: ak server vráti 'denied' na sekcii, ktorú bootstrap očakával
// ako povolenú, obnoví sa bootstrap a bundle sa načíta ešte RAZ (max 1 refetch
// na načítanie obrazovky). Ak nesúlad pretrvá, widget ostáva skrytý a nesúlad
// sa zaloguje do konzoly — ďalší refetch sa nevykoná (ochrana proti slučke).

import { apiCall } from './client'

function unexpectedDenied(bundle, expectedSections) {
  if (!expectedSections) return []
  return Object.entries(bundle?.sections || {})
    .filter(([name, s]) => s?.status === 'denied' && expectedSections[name])
    .map(([name]) => name)
}

export async function loadBundle(action, payload, { expectedSections, refreshBootstrap } = {}) {
  let bundle = await apiCall(action, payload)
  const denied = unexpectedDenied(bundle, expectedSections)
  if (denied.length && typeof refreshBootstrap === 'function') {
    let fresh = null
    try {
      fresh = await refreshBootstrap()
    } catch {
      return bundle // obnova bootstrapu zlyhala — pracujeme s tým, čo máme
    }
    const stillExpected = denied.filter(name => fresh?.[name])
    if (stillExpected.length) {
      bundle = await apiCall(action, payload) // max 1 refetch na načítanie obrazovky
      const persisting = unexpectedDenied(bundle, fresh)
      if (persisting.length) {
        console.error(
          'PCW: sekcie [' + persisting.join(', ') + '] akcie ' + action +
          ' sú podľa bootstrapu povolené, ale server ich vracia ako denied — widget ostáva skrytý.'
        )
      }
    }
  }
  return bundle
}

// Pohodlný prístup k sekcii: vráti { ok, denied, error, data }.
export function section(bundle, name) {
  const s = bundle?.sections?.[name] || null
  return {
    ok: s?.status === 'ok',
    denied: !s || s.status === 'denied',
    error: s?.status === 'error',
    data: s?.status === 'ok' ? s.data : null,
  }
}
