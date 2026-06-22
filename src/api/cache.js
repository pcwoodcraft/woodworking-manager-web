// Krátkodobá cache API odpovedí v sessionStorage (prepínanie menu bez nového GAS behu).

const TTL_MS = 45_000
const PREFIX = 'pcw_cache_'

export function cacheGet(key) {
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    if (!raw) return null
    const { at, data } = JSON.parse(raw)
    if (Date.now() - at > TTL_MS) {
      sessionStorage.removeItem(PREFIX + key)
      return null
    }
    return data
  } catch {
    return null
  }
}

export function cacheSet(key, data) {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), data }))
  } catch { /* quota */ }
}

export function cacheRemove(key) {
  try { sessionStorage.removeItem(PREFIX + key) } catch { /* ignore */ }
}

export function invalidateProjectCaches(projectId) {
  cacheRemove('projectsPage')
  cacheRemove('dashboardPage')
  if (projectId) cacheRemove('projectDetail:' + projectId)
}

export async function fetchCached(key, fetcher, { force } = {}) {
  if (!force) {
    const hit = cacheGet(key)
    if (hit != null) return { data: hit, fromCache: true }
  }
  const data = await fetcher()
  cacheSet(key, data)
  return { data, fromCache: false }
}
