import { useAuth } from './AuthContext'

// Stráž priamym prístupom na URL: bez práva sa modul nezobrazí.
// Skutočná kontrola je na serveri — toto je len zrozumiteľná hláška.
export default function RequirePerm({ perm, children }) {
  const { can } = useAuth()
  const allowed = Array.isArray(perm) ? perm.some(can) : can(perm)
  if (!allowed) {
    return (
      <div className="no-access">
        <h2>Nemáte oprávnenie</h2>
        <p>Na zobrazenie tejto časti nemáte pridelené právo. Požiadajte správcu systému.</p>
      </div>
    )
  }
  return children
}
