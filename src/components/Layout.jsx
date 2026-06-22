import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import LoginScreen from '../auth/LoginScreen'

// Položky menu: zobrazia sa len s príslušným právom (kozmetika — server kontroluje sám).
const MENU = [
  { to: '/', label: 'Prehľad', icon: '◧', end: true },
  { to: '/zakaznici', label: 'Zákazníci', icon: '◔', perm: 'perm_customers' },
  { to: '/projekty', label: 'Projekty', icon: '◩', perm: 'perm_projects_read' },
  { to: '/dielna', label: 'Dielňa', icon: '◰', perm: 'perm_projects_read' },
  { to: '/faktury', label: 'Faktúry', icon: '◫', perm: 'perm_invoices_full' },
  { to: '/naklady', label: 'Náklady', icon: '◭', perm: 'perm_costs_full' },
  { to: '/zamestnanci', label: 'Zamestnanci', icon: '◗', perm: 'perm_employees' },
  { to: '/administracia', label: 'Administrácia', icon: '⚙', perm: 'perm_admin' },
]

export default function Layout() {
  const { me, can, signOut, expired } = useAuth()
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">PCW</span>
          <span className="brand-name">Manager</span>
        </div>
        <nav>
          {MENU.filter(m => !m.perm || can(m.perm)).map(m => (
            <NavLink key={m.to} to={m.to} end={m.end} className="nav-item">
              <span className="nav-icon">{m.icon}</span>
              {m.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="user-name">{me?.name || me?.email}</div>
          <div className="user-email">{me?.email}</div>
          <button className="btn btn-ghost" onClick={signOut}>Odhlásiť sa</button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
      {expired && <LoginScreen overlay />}
    </div>
  )
}
