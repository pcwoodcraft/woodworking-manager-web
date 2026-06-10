// Prihlásenie cez Google Identity Services (GIS) + profil a práva z getMe.
//
// Stavy: loading (zisťuje sa uložené prihlásenie) -> signedOut | signedIn.
// Pri expirácii tokenu sa skúsi tiché obnovenie; ak zlyhá, nastaví sa
// `expired` a nad appkou sa zobrazí prihlasovacie okno — rozpísané
// formuláre zostávajú v stave, nič sa nestráca.

import { createContext, useContext, useEffect, useCallback, useState, useRef } from 'react'
import { GOOGLE_CLIENT_ID } from '../config'
import { bindAuth, apiCall } from '../api/client'

const AuthContext = createContext(null)

const TOKEN_KEY = 'pcw_token'

function tokenExp(token) {
  try {
    return JSON.parse(atob(token.split('.')[1])).exp * 1000
  } catch {
    return 0
  }
}

function validToken() {
  const t = sessionStorage.getItem(TOKEN_KEY)
  return t && tokenExp(t) > Date.now() + 60_000 ? t : null
}

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading') // loading | signedOut | signedIn
  const [expired, setExpired] = useState(false)
  const [me, setMe] = useState(null)
  const [loginError, setLoginError] = useState('')
  const tokenRef = useRef(validToken())

  const handleUnauthorized = useCallback(() => {
    // token už neplatí — skúsi sa tiché obnovenie cez One Tap, inak prihlasovacie okno
    sessionStorage.removeItem(TOKEN_KEY)
    tokenRef.current = null
    setExpired(true)
    if (window.google) window.google.accounts.id.prompt()
  }, [])

  useEffect(() => {
    bindAuth({ token: () => tokenRef.current, unauthorized: handleUnauthorized })
  }, [handleUnauthorized])

  // Spracovanie tokenu z Google tlačidla / One Tap
  const onCredential = useCallback(async (response) => {
    const token = response.credential
    tokenRef.current = token
    sessionStorage.setItem(TOKEN_KEY, token)
    setLoginError('')
    try {
      const profile = await apiCall('getMe')
      setMe(profile)
      setStatus('signedIn')
      setExpired(false)
    } catch (e) {
      tokenRef.current = null
      sessionStorage.removeItem(TOKEN_KEY)
      setMe(null)
      setStatus('signedOut')
      setLoginError(
        e.code === 'UNAUTHORIZED'
          ? 'Tento účet nemá prístup do systému. Požiadajte správcu o pridanie.'
          : 'Prihlásenie zlyhalo: ' + e.message
      )
    }
  }, [])

  // Inicializácia GIS po načítaní knižnice
  const onCredentialRef = useRef(onCredential)
  onCredentialRef.current = onCredential
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
      })
      setGisReady(true)
      // pokus o obnovenie existujúceho sedenia
      const saved = validToken()
      if (saved) {
        tokenRef.current = saved
        apiCall('getMe')
          .then((profile) => { if (!cancelled) { setMe(profile); setStatus('signedIn') } })
          .catch(() => { if (!cancelled) setStatus('signedOut') })
      } else {
        setStatus('signedOut')
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  const signOut = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY)
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
