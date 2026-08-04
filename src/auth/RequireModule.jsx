import { useAuth } from './AuthContext'

// Stráž priamym prístupom na URL: modul, ktorý inštancia nemá, sa nedá otvoriť.
// Skutočná kontrola je na serveri (MODULE_DISABLED) — toto je len zrozumiteľná hláška.
export default function RequireModule({ module, children }) {
  const { hasModule } = useAuth()
  if (!hasModule(module)) {
    return (
      <div className="no-access">
        <h2>Modul nie je aktívny</h2>
        <p>Táto časť systému nie je vo vašej inštancii zapnutá. Ak ju potrebujete, ozvite sa správcovi.</p>
      </div>
    )
  }
  return children
}
