import { useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'

// Oficiálne tlačidlo „Prihlásiť sa cez Google" — vykresľuje ho knižnica GIS.
export default function GoogleButton() {
  const { gisReady } = useAuth()
  const ref = useRef(null)

  useEffect(() => {
    if (gisReady && ref.current && window.google) {
      window.google.accounts.id.renderButton(ref.current, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        locale: 'sk',
        width: 280,
      })
    }
  }, [gisReady])

  return <div ref={ref} className="google-btn" />
}
