import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import LoginScreen from '../auth/LoginScreen'

// Položky menu: zobrazia sa len s príslušným právom a len ak je modul v inštancii aktívny
// (oboje kozmetika — server kontroluje právo aj modul sám).
const MENU = [
  { to: '/', label: 'Prehľad', icon: '◧', end: true },
  { to: '/zakaznici', label: 'Zákazníci', icon: '◔', perm: 'perm_customers', module: 'core' },
  { to: '/atelier', label: 'Ateliér', icon: '◈', perm: 'perm_customers', module: 'quotes' },
  { to: '/projekty', label: 'Projekty', icon: '◩', perm: 'perm_projects_read', module: 'projects' },
  { to: '/dielna', label: 'Dielňa', icon: '◰', perm: 'perm_projects_read', module: 'workshop' },
  { to: '/faktury', label: 'Faktúry', icon: '◫', perm: 'perm_invoices_full', module: 'invoicing' },
  { to: '/ekonomika', label: 'Ekonomika', icon: '◭', perm: 'perm_costs_full', module: 'finance' },
  { to: '/statistiky', label: 'Štatistiky', icon: '◬', perm: 'perm_costs_full', module: 'stats' },
  { to: '/socialne-siete', label: 'Sociálne siete', icon: '◉', perm: 'perm_social', module: 'marketing' },
  { to: '/zamestnanci', label: 'Zamestnanci', icon: '◗', perm: 'perm_employees', module: 'employees' },
  { to: '/administracia', label: 'Administrácia', icon: '⚙', perm: 'perm_admin', module: 'core' },
]

export default function Layout() {
  const { me, can, hasModule, signOut, expired } = useAuth()
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">PCW</span>
          <span className="brand-name">Manager</span>
        </div>
        <nav>
          {MENU.filter(m => (!m.perm || can(m.perm)) && (!m.module || hasModule(m.module))).map(m => (
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
