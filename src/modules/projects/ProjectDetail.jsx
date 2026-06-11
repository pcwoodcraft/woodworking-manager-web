import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Spinner, ErrorBox, StatusBadge } from '../../components/ui'
import { useToast } from '../../components/Toast'
import ProjectForm from './ProjectForm'
import {
  fmtMoney, fmtDate, parseNum, toIsoDate,
  PROJECT_STATUSES, normalizeStatus, statusLabel,
} from '../../utils/format'

const CONFIRM_STATUSES = {
  uzavrety: 'Naozaj uzavrieť projekt? Uzavretý projekt zmizne z bežiacich a považuje sa za ukončený.',
  zruseny: 'Naozaj označiť projekt ako zrušený?',
}

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = useAuth()
  const canWrite = can('perm_projects_write')
  const canHours = can('perm_timesheets')
  const canInvoices = can('perm_invoices_full')

  const [state, setState] = useState({ loading: true, error: null })
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('prehlad')
  const [editing, setEditing] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)

  const load = async () => {
    setState({ loading: true, error: null })
    try {
      const [projects, customers, entries, invoices, incoming, material] = await Promise.all([
        apiCall('getProjects'),
        can('perm_customers') ? apiCall('getCustomers') : Promise.resolve([]),
        canHours ? apiCall('getTimeEntries') : Promise.resolve([]),
        canInvoices ? apiCall('getInvoices') : Promise.resolve([]),
        canInvoices ? apiCall('getIncomingInvoices') : Promise.resolve([]),
        apiCall('getMaterialItems'),
      ])
      setData({ projects, customers, entries, invoices, incoming, material })
      setState({ loading: false, error: null })
    } catch (e) {
      setState({ loading: false, error: e })
    }
  }

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (state.loading) return <Spinner />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  const project = data.projects.find(p => String(p.id) === String(id))
  if (!project) {
    return (
      <div className="page">
        <p className="muted">Projekt sa nenašiel. <Link to="/projekty">Späť na zoznam</Link></p>
      </div>
    )
  }

  const entries = data.entries.filter(e => String(e.projectId) === String(id))
  const hoursTotal = entries.reduce((s, e) => s + parseNum(e.durationMin), 0) / 60
  const laborTotal = entries.reduce((s, e) => s + parseNum(e.laborCost), 0)
  const material = data.material.filter(m => String(m.projectId) === String(id))
  const materialTotal = material.reduce((s, m) => s + parseNum(m.amount), 0)
  const issued = data.invoices.filter(i => String(i.projectId) === String(id))
  const received = data.incoming.filter(i => String(i.projectId) === String(id))
  const receivedTotal = received.reduce((s, i) => s + parseNum(i.amountGross), 0)

  const changeStatus = async (e) => {
    const status = e.target.value
    if (!status || status === normalizeStatus(project.status)) return
    if (CONFIRM_STATUSES[status] && !window.confirm(CONFIRM_STATUSES[status])) {
      e.target.value = normalizeStatus(project.status)
      return
    }
    setSavingStatus(true)
    try {
      await apiCall('updateProjectStatus', { id: project.id, status })
      toast('Stav zmenený na „' + statusLabel(status) + '“')
      await load()
    } catch (err) {
      toast('Nepodarilo sa zmeniť stav: ' + err.message, 'err')
    } finally {
      setSavingStatus(false)
    }
  }

  const norm = normalizeStatus(project.status)
  const overdue = project.deadline && toIsoDate(project.deadline) < toIsoDate(new Date().toISOString())
    && norm !== 'uzavrety' && norm !== 'odovzdany' && norm !== 'zruseny'

  return (
    <div className="page">
      <div className="breadcrumb"><Link to="/projekty">Projekty</Link> / {project.name}</div>
      <header className="page-head">
        <div>
          <h1>{project.name}</h1>
          <div className="muted">{project.customer}</div>
        </div>
        <div className="head-actions">
          {canWrite && (
            <select className="status-select" value={norm} onChange={changeStatus} disabled={savingStatus}>
              {PROJECT_STATUSES.map(s => (
                <option key={s.value} value={s.value}>
                  {s.value === 'uzavrety' ? '🔒 Uzavrieť projekt' : s.label}
                </option>
              ))}
            </select>
          )}
          {!canWrite && <StatusBadge status={project.status} />}
          {canWrite && <button className="btn" onClick={() => setEditing(true)}>Upraviť</button>}
        </div>
      </header>

      <div className="tabs">
        <button className={tab === 'prehlad' ? 'tab active' : 'tab'} onClick={() => setTab('prehlad')}>Prehľad</button>
        {canHours && <button className={tab === 'hodiny' ? 'tab active' : 'tab'} onClick={() => setTab('hodiny')}>Hodiny ({entries.length})</button>}
        <button className={tab === 'naklady' ? 'tab active' : 'tab'} onClick={() => setTab('naklady')}>Faktúry a náklady</button>
      </div>

      {tab === 'prehlad' && (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Stav</div>
              <div className="stat-value-sm"><StatusBadge status={project.status} /></div>
              <div className="stat-sub">Termín: <span className={overdue ? 'overdue' : ''}>{fmtDate(project.deadline)}{overdue ? ' ⚠' : ''}</span></div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Cena</div>
              <div className="stat-value">{fmtMoney(project.price)}</div>
              <div className="stat-sub">sadzba {fmtMoney(project.hourlyRate)}/h</div>
            </div>
            {canHours && (
              <div className="stat-card">
                <div className="stat-label">Odpracované</div>
                <div className="stat-value">{hoursTotal.toLocaleString('sk-SK', { maximumFractionDigits: 1 })} h</div>
                <div className="stat-sub">{project.estimatedHours ? 'odhad ' + project.estimatedHours + ' h' : 'bez odhadu'}</div>
              </div>
            )}
            <div className="stat-card">
              <div className="stat-label">Materiál</div>
              <div className="stat-value">{fmtMoney(materialTotal)}</div>
              <div className="stat-sub">{project.estimatedMaterialCosts ? 'odhad ' + fmtMoney(project.estimatedMaterialCosts) : 'bez odhadu'}</div>
            </div>
          </div>
          {project.notes && (
            <div className="card"><h2>Poznámky</h2><p className="prewrap">{project.notes}</p></div>
          )}
        </>
      )}

      {tab === 'hodiny' && canHours && (
        <div className="card">
          {entries.length === 0 ? <p className="muted">Zatiaľ žiadne záznamy hodín.</p> : (
            <table className="table">
              <thead>
                <tr><th>Dátum</th><th>Pracovník</th><th>Činnosť</th><th className="num">Hodiny</th><th className="num">Mzdový náklad</th></tr>
              </thead>
              <tbody>
                {[...entries]
                  .sort((a, b) => (toIsoDate(b.date) || toIsoDate(b.startTime)).localeCompare(toIsoDate(a.date) || toIsoDate(a.startTime)))
                  .map(e => (
                    <tr key={e.id || e.startTime + e.employeeId}>
                      <td>{fmtDate(e.date || e.startTime)}</td>
                      <td>{e.employeeName || '—'}</td>
                      <td>{e.task}</td>
                      <td className="num">{(parseNum(e.durationMin) / 60).toLocaleString('sk-SK', { maximumFractionDigits: 1 })}</td>
                      <td className="num">{fmtMoney(e.laborCost)}</td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="strong">Spolu</td>
                  <td className="num strong">{hoursTotal.toLocaleString('sk-SK', { maximumFractionDigits: 1 })}</td>
                  <td className="num strong">{fmtMoney(laborTotal)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {tab === 'naklady' && (
        <>
          <div className="card">
            <h2>Materiál ({material.length}) — spolu {fmtMoney(materialTotal)}</h2>
            {material.length === 0 ? <p className="muted">Žiadny materiál.</p> : (
              <table className="table">
                <thead><tr><th>Položka</th><th>Kategória</th><th className="num">Suma</th></tr></thead>
                <tbody>
                  {material.map(m => (
                    <tr key={m.id}><td>{m.name}</td><td>{m.category}</td><td className="num">{fmtMoney(m.amount)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {canInvoices && (
            <>
              <div className="card">
                <h2>Prijaté faktúry k projektu ({received.length}) — spolu {fmtMoney(receivedTotal)}</h2>
                {received.length === 0 ? <p className="muted">Žiadne priradené prijaté faktúry.</p> : (
                  <table className="table">
                    <thead><tr><th>Dodávateľ</th><th>Číslo</th><th>Splatnosť</th><th>Stav</th><th className="num">Suma</th></tr></thead>
                    <tbody>
                      {received.map(i => (
                        <tr key={i.id}>
                          <td>{i.vendor}</td>
                          <td>{i.driveLink ? <a href={i.driveLink} target="_blank" rel="noreferrer">{i.invoiceNumber}</a> : i.invoiceNumber}</td>
                          <td>{fmtDate(i.dueDate)}</td>
                          <td>{i.status}</td>
                          <td className="num">{fmtMoney(i.amountGross)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="card">
                <h2>Vydané faktúry ({issued.length})</h2>
                {issued.length === 0 ? <p className="muted">Žiadne vydané faktúry k projektu.</p> : (
                  <table className="table">
                    <thead><tr><th>Číslo</th><th>Vystavená</th><th>Splatnosť</th><th>Stav</th><th className="num">Suma</th></tr></thead>
                    <tbody>
                      {issued.map(i => (
                        <tr key={i.id}>
                          <td>{i.number}</td>
                          <td>{fmtDate(i.issueDate)}</td>
                          <td>{fmtDate(i.dueDate)}</td>
                          <td>{i.status}</td>
                          <td className="num">{fmtMoney(i.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </>
      )}

      {editing && (
        <ProjectForm
          project={project}
          customers={data.customers}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); load() }}
        />
      )}
    </div>
  )
}
