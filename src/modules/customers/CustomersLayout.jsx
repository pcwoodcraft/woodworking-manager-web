import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

// Zákazníci sú jadro (kartotéka), ale podmenu vedie aj do CRM a Cenových ponúk.
// Bez filtrovania podľa modulu by pri vypnutom CRM ostali v UI záložky, ktoré po kliknutí
// povedia „Modul nie je aktívny" — presne to, čomu sa má vypnutý modul vyhnúť.
const SUBNAV = [
  { to: '/zakaznici', label: 'Zoznam', end: true },
  { to: '/zakaznici/novy-dopyt', label: 'Nový dopyt', module: 'crm' },
  { to: '/zakaznici/pipeline', label: 'Pipeline', module: 'crm' },
  { to: '/zakaznici/dnes', label: 'Dnes', module: 'crm' },
  { to: '/zakaznici/prehlad', label: 'Prehľad', module: 'crm' },
  { to: '/zakaznici/ponuky', label: 'Cenové ponuky', module: 'quotes' },
]

export default function CustomersLayout() {
  const { hasModule } = useAuth()
  return (
    <div className="page page-wide">
      <header className="page-head">
        <h1>Zákazníci</h1>
      </header>
      <nav className="subnav">
        {SUBNAV.filter(item => !item.module || hasModule(item.module)).map(item => (
          <NavLink key={item.to} to={item.to} end={item.end} className="subnav-item">
            {item.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
