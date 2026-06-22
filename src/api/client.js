// API klient: pridáva token, jednotné spracovanie chýb, retry pre čítanie.
// Backend: { ok:true, data } / { ok:false, error, message }

import { API_URL } from '../config'

let getToken = () => null
let onUnauthorized = () => {}

// AuthContext si sem pri štarte zaregistruje prístup k tokenu a reakciu na odhlásenie
export function bindAuth({ token, unauthorized }) {
  getToken = token
  onUnauthorized = unauthorized
}

export class ApiError extends Error {
  constructor(code, message) {
    super(message || code)
    this.code = code
  }
}

async function rawCall(action, payload) {
  const res = await fetch(API_URL, {
    method: 'POST',
    // text/plain => prehliadač neposiela CORS preflight, Apps Script ho nevie obslúžiť
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ token: getToken(), action, payload }),
  })
  if (!res.ok) throw new ApiError('HTTP_' + res.status, 'Server neodpovedá (' + res.status + ')')
  const json = await res.json()
  if (json.ok === false) {
    if (json.error === 'UNAUTHORIZED') onUnauthorized()
    throw new ApiError(json.error, json.message)
  }
  return json.data
}

const RETRYABLE = new Set(['HTTP_429', 'HTTP_500', 'HTTP_502', 'HTTP_503'])
const TIMING_KEY = 'pcw_api_timings'

function logApiTiming(action, ms, ok) {
  try {
    const list = JSON.parse(sessionStorage.getItem(TIMING_KEY) || '[]')
    list.push({
      action,
      ms: Math.round(ms),
      ok: ok !== false,
      at: new Date().toISOString(),
    })
    while (list.length > 40) list.shift()
    sessionStorage.setItem(TIMING_KEY, JSON.stringify(list))
  } catch { /* sessionStorage nedostupné */ }
}

export function getApiTimings() {
  try {
    return JSON.parse(sessionStorage.getItem(TIMING_KEY) || '[]')
  } catch {
    return []
  }
}

export function clearApiTimings() {
  try { sessionStorage.removeItem(TIMING_KEY) } catch { /* ignore */ }
}

export async function apiCall(action, payload = {}) {
  const isRead = action.startsWith('get')
  let lastErr
  const attempts = isRead ? 3 : 1
  for (let i = 0; i < attempts; i++) {
    const t0 = performance.now()
    try {
      const data = await rawCall(action, payload)
      logApiTiming(action, performance.now() - t0, true)
      return data
    } catch (e) {
      logApiTiming(action, performance.now() - t0, false)
      lastErr = e
      const isNetwork = !(e instanceof ApiError)
      if (i < attempts - 1 && (isNetwork || RETRYABLE.has(e.code))) {
        await new Promise(r => setTimeout(r, 600 * (i + 1)))
        continue
      }
      throw e
    }
  }
  throw lastErr
}
