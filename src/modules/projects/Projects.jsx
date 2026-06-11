import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Spinner, ErrorBox, StatusBadge } from '../../components/ui'
import ProjectForm from './ProjectForm'
import { fmtMoney, fmtDate, toIsoDate, PROJECT_STATUSES, normalizeStatus } from '../../utils/format'

export default function Projects() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const canWrite = can('perm_projects_write')
  const [state, setState] = useState({ loading: true, error: null })
  const [projects, setProjects] = useState([])
  const [customers, setCustomers] = useState([])
  const [statusFilter, setStatusFilter] = useState('bezici')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(null) // null | 'new'

  const load = async () => {
    setState({ loading: true, error: null })
    try {
      const [p, c] = await Promise.all([
        apiCall('getProjects'),
        can('perm_customers') ? apiCall('getCustomers') : Promise.resolve([]),
      ])
      setProjects(p)
      setCustomers(c)
      setState({ loading: false, error: null })
    } catch (e) {
      setState({ loading: false, error: e })
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (state.loading) return <Spinner />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  const visible = projects
    .filter(p => {
      const norm = normalizeStatus(p.status)
      if (statusFilter === 'bezici') return norm !== 'uzavrety' && norm !== 'zruseny'
      if (statusFilter === '') return true
      return norm === statusFilter
    })
    .filter(p => {
      const q = search.trim().toLowerCase()
      if (!q) return true
      return (p.name || '').toLowerCase().includes(q) || (p.customer || '').toLowerCase().includes(q)
    })
    .sort((a, b) => (toIsoDate(b.deadline) || '9999').localeCompare(toIsoDate(a.deadline) || '9999'))

  return (
    <div className="page">
      <header className="page-head">
        <h1>Projekty</h1>
        {canWrite && <button className="btn" onClick={() => setForm('new')}>+ Nový projekt</button>}
      </header>

      <div className="filter-bar">
        <input
          className="filter-search"
          placeholder="Hľadať projekt alebo zákazníka…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="bezici">Bežiace</option>
          <option value="">Všetky</option>
          {PROJECT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="card">
        {visible.length === 0 ? (
          <p className="muted">Žiadne projekty nezodpovedajú filtru.</p>
        ) : (
          <table className="table table-click">
            <thead>
              <tr><th>Projekt</th><th>Zákazník</th><th>Stav</th><th>Termín</th><th className="num">Cena</th></tr>
            </thead>
            <tbody>
              {visible.map(p => (
                <tr key={p.id} onClick={() => navigate('/projekty/' + p.id)}>
                  <td className="strong">{p.name}</td>
                  <td>{p.customer}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>{fmtDate(p.deadline)}</td>
                  <td className="num">{fmtMoney(p.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {form === 'new' && (
        <ProjectForm
          customers={customers}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); load() }}
        />
      )}
    </div>
  )
}
