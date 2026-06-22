// Prihlásenie cez Google Identity Services (GIS) + profil a práva z getMe.
//
// Token sa ukladá do localStorage a pred expiráciou sa ticho obnoví cez GIS.
// Pri expirácii sa najprv skúsi One Tap, až potom prihlasovacie okno.

import { createContext, useContext, useEffect, useCallback, useState, useRef } from 'react'
import { GOOGLE_CLIENT_ID } from '../config'
import { bindAuth, apiCall } from '../api/client'

const AuthContext = createContext(null)

const TOKEN_KEY = 'pcw_token'
const SESSION_HINT_KEY = 'pcw_signed_in'
const REFRESH_MARGIN_MS = 10 * 60_000
const REFRESH_CHECK_MS = 4 * 60_000

function tokenExp(token) {
  try {
    return JSON.parse(atob(token.split('.')[1])).exp * 1000
  } catch {
    return 0
  }
}

function readStoredToken() {
  const fromLocal = localStorage.getItem(TOKEN_KEY)
  if (fromLocal) return fromLocal
  const fromSession = sessionStorage.getItem(TOKEN_KEY)
  if (fromSession) {
    localStorage.setItem(TOKEN_KEY, fromSession)
    sessionStorage.removeItem(TOKEN_KEY)
    return fromSession
  }
  return null
}

function validToken() {
  const t = readStoredToken()
  return t && tokenExp(t) > Date.now() + 60_000 ? t : null
}

function persistToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(SESSION_HINT_KEY, '1')
  sessionStorage.removeItem(TOKEN_KEY)
}

function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(SESSION_HINT_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
}

function promptRenewal() {
  if (!window.google?.accounts?.id) return false
  window.google.accounts.id.prompt()
  return true
}

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading')
  const [expired, setExpired] = useState(false)
  const [me, setMe] = useState(null)
  const [loginError, setLoginError] = useState('')
  const tokenRef = useRef(validToken())

  const handleUnauthorized = useCallback(() => {
    tokenRef.current = null
    localStorage.removeItem(TOKEN_KEY)
    setExpired(true)
    if (!promptRenewal()) setStatus('signedOut')
  }, [])

  useEffect(() => {
    bindAuth({ token: () => tokenRef.current, unauthorized: handleUnauthorized })
  }, [handleUnauthorized])

  const onCredential = useCallback(async (response) => {
    const token = response.credential
    tokenRef.current = token
    persistToken(token)
    setLoginError('')
    try {
      const profile = await apiCall('getMe')
      setMe(profile)
      setStatus('signedIn')
      setExpired(false)
    } catch (e) {
      clearStoredAuth()
      tokenRef.current = null
      setMe(null)
      setStatus('signedOut')
      setLoginError(
        e.code === 'UNAUTHORIZED'
          ? 'Tento účet nemá prístup do systému. Požiadajte správcu o pridanie.'
          : 'Prihlásenie zlyhalo: ' + e.message
      )
    }
  }, [])

  const onCredentialRef = useRef(onCredential)
  useEffect(() => { onCredentialRef.current = onCredential }, [onCredential])
  const [gisReady, setGisReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const init = () => {
      if (cancelled) return
      if (!window.google?.accounts?.id) {
        setTimeout(init, 100)
        return
      }
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (r) => onCredentialRef.current(r),
        auto_select: true,
        itp_support: true,
        cancel_on_tap_outside: false,
      })
      setGisReady(true)

      const saved = validToken()
      if (saved) {
        tokenRef.current = saved
        apiCall('getMe')
          .then((profile) => { if (!cancelled) { setMe(profile); setStatus('signedIn'); setExpired(false) } })
          .catch(() => {
            if (cancelled) return
            if (localStorage.getItem(SESSION_HINT_KEY)) promptRenewal()
            else setStatus('signedOut')
          })
      } else if (localStorage.getItem(SESSION_HINT_KEY)) {
        promptRenewal()
        setTimeout(() => {
          if (!cancelled && !tokenRef.current) setStatus('signedOut')
        }, 4000)
      } else {
        setStatus('signedOut')
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (status !== 'signedIn') return
    const tick = () => {
      const t = tokenRef.current
      if (!t) return
      if (tokenExp(t) - Date.now() < REFRESH_MARGIN_MS) promptRenewal()
    }
    tick()
    const id = setInterval(tick, REFRESH_CHECK_MS)
    return () => clearInterval(id)
  }, [status])

  const signOut = useCallback(() => {
    clearStoredAuth()
    tokenRef.current = null
    setMe(null)
    setExpired(false)
    setStatus('signedOut')
    if (window.google) window.google.accounts.id.disableAutoSelect()
  }, [])

  const can = useCallback((perm) => !!me?.perms?.[perm], [me])

  const value = { status, expired, me, can, signOut, gisReady, loginError }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
