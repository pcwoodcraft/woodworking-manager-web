import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { cacheGet, cacheSet, invalidateProjectCaches } from '../../api/cache'
import { useAuth } from '../../auth/AuthContext'
import { Spinner, ErrorBox, StatusBadge } from '../../components/ui'
import ProjectForm from './ProjectForm'
import { fmtMoney, fmtDate, fmtPercent, toIsoDate, PROJECT_STATUSES, normalizeStatus, isRunningStatus, budgetLevel, priorityLabel, sortProjectsForSchedule, projectPriceNet } from '../../utils/format'

export default function Projects() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const canWrite = can('perm_projects_write')
  const [state, setState] = useState({ loading: true, error: null })
  const [projects, setProjects] = useState([])
  const [customers, setCustomers] = useState([])
  const [warnings, setWarnings] = useState([])
  const [statusFilter, setStatusFilter] = useState('bezici')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(null) // null | 'new' | projekt na úpravu

  const applyPage = (page) => {
    setProjects(page.projects || [])
    setCustomers(page.customers || [])
    setWarnings(page.warnings || [])
  }

  const load = async () => {
    const hit = cacheGet('projectsPage')
    if (hit) {
      applyPage(hit)
      setState({ loading: false, error: null })
    } else {
      setState({ loading: true, error: null })
    }
    try {
      const page = await apiCall('getProjectsPage')
      cacheSet('projectsPage', page)
      applyPage(page)
      setState({ loading: false, error: null })
    } catch (e) {
      if (!hit) setState({ loading: false, error: e })
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (state.loading) return <Spinner />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  const warningMap = Object.fromEntries(warnings.map(w => [String(w.id), w]))

  const visible = projects
    .filter(p => {
      const norm = normalizeStatus(p.status)
      if (statusFilter === 'bezici') return isRunningStatus(p.status)
      if (statusFilter === '') return true
      return norm === statusFilter
    })
    .filter(p => {
      const q = search.trim().toLowerCase()
      if (!q) return true
      return (p.name || '').toLowerCase().includes(q) || (p.customer || '').toLowerCase().includes(q) || (p.id || '').toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (statusFilter === 'bezici') return sortProjectsForSchedule(a, b)
      return (toIsoDate(b.deadline) || '9999').localeCompare(toIsoDate(a.deadline) || '9999')
    })

  return (
    <div className="page">
      <header className="page-head">
        <h1>Projekty</h1>
        {canWrite && <button className="btn" onClick={() => setForm('new')}>+ Nový projekt</button>}
      </header>

      <div className="filter-bar">
        <input
          className="filter-search"
          placeholder="Hľadať projekt, ID alebo zákazníka…"
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
              <tr><th>Projekt</th><th>ID</th><th>Zákazník</th><th>Stav</th><th>Priorita</th><th>Termín</th><th className="num">Cena bez DPH</th><th className="num">Náklady</th>{canWrite && <th />}</tr>
            </thead>
            <tbody>
              {visible.map(p => {
                const w = warningMap[String(p.id)]
                const level = w ? budgetLevel(w.costPercent) : 'none'
                return (
                <tr key={p.id} onClick={() => navigate('/projekty/' + p.id)}>
                  <td className="strong">{p.name}</td>
                  <td className="project-id">{p.id}</td>
                  <td>{p.customer}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>{priorityLabel(p.priority)}</td>
                  <td>{fmtDate(p.deadline)}</td>
                  <td className="num">{fmtMoney(projectPriceNet(p))}</td>
                  <td className={'num' + (level === 'over' ? ' budget-label-over' : level === 'warn' ? ' budget-label-warn' : '')}>
                    {w ? fmtPercent(w.costPercent) : '—'}
                  </td>
                  {canWrite && (
                    <td className="row-action">
                      <button
                        className="icon-btn"
                        title="Upraviť projekt"
                        onClick={(e) => { e.stopPropagation(); setForm(p) }}
                      >✎</button>
                    </td>
                  )}
                </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {form && (
        <ProjectForm
          project={form === 'new' ? null : form}
          customers={customers}
          onClose={() => setForm(null)}
          onSaved={() => { invalidateProjectCaches(); setForm(null); load() }}
        />
      )}
    </div>
  )
}
