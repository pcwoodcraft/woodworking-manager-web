import { NavLink, Outlet } from 'react-router-dom'

const SUBNAV = [
  { to: '/zakaznici', label: 'Zoznam', end: true },
  { to: '/zakaznici/novy-dopyt', label: 'Nový dopyt' },
  { to: '/zakaznici/pipeline', label: 'Pipeline' },
  { to: '/zakaznici/dnes', label: 'Dnes' },
  { to: '/zakaznici/ponuky', label: 'Cenové ponuky' },
]

export default function CustomersLayout() {
  return (
    <div className="page page-wide">
      <header className="page-head">
        <h1>Zákazníci</h1>
      </header>
      <nav className="subnav">
        {SUBNAV.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end} className="subnav-item">
            {item.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
