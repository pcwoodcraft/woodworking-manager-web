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

export async function apiCall(action, payload = {}) {
  const isRead = action.startsWith('get')
  let lastErr
  const attempts = isRead ? 3 : 1 // zápisy sa neopakujú, aby nevznikli duplicity
  for (let i = 0; i < attempts; i++) {
    try {
      return await rawCall(action, payload)
    } catch (e) {
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
