import { useAuth } from './AuthContext'
import GoogleButton from './GoogleButton'

// Celostránkové prihlásenie (signedOut) aj overlay pri expirácii sedenia —
// overlay nezhadzuje appku, takže rozpísané formuláre zostávajú zachované.
export default function LoginScreen({ overlay = false }) {
  const { loginError } = useAuth()
  return (
    <div className={overlay ? 'login-overlay' : 'login-page'}>
      <div className="login-card">
        <div className="login-logo">PCW</div>
        <h1>PCW Manager</h1>
        <p className="login-sub">
          {overlay
            ? 'Prihlásenie vypršalo. Prihláste sa znova — rozpísaná práca zostáva zachovaná.'
            : 'Interný systém stolárstva. Prihláste sa firemným Google účtom.'}
        </p>
        <GoogleButton />
        {loginError && <p className="login-error">{loginError}</p>}
      </div>
    </div>
  )
}
