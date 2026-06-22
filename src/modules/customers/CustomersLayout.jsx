import { NavLink, Outlet } from 'react-router-dom'

const SUBNAV = [
  { to: '/zakaznici', label: 'Zoznam', end: true },
  { to: '/zakaznici/novy-dopyt', label: 'Nový dopyt' },
  { to: '/zakaznici/pipeline', label: 'Pipeline', soon: true },
  { to: '/zakaznici/dnes', label: 'Dnes', soon: true },
]

export default function CustomersLayout() {
  return (
    <div className="page">
      <header className="page-head">
        <h1>Zákazníci</h1>
      </header>
      <nav className="subnav">
        {SUBNAV.map(item => item.soon ? (
          <span key={item.to} className="subnav-item subnav-soon" title="Fáza F4.1">{item.label}</span>
        ) : (
          <NavLink key={item.to} to={item.to} end={item.end} className="subnav-item">
            {item.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
