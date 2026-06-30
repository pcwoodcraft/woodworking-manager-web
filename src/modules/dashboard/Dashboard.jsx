import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { cacheGet, cacheSet } from '../../api/cache'
import { useAuth } from '../../auth/AuthContext'
import { Spinner, ErrorBox, StatusBadge } from '../../components/ui'
import {
  fmtMoney, fmtDate, fmtPercent, parseNum, isRunningStatus, toIsoDate, budgetLevel, projectPriceNet,
} from '../../utils/format'

export default function Dashboard() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const [crmSummary, setCrmSummary] = useState(null)

  const showFinance = can('perm_invoices_full')
  const showProjects = can('perm_projects_read')
  const showCrm = can('perm_customers')
  const isAdmin = can('perm_admin')

  const applyData = (d) => setState({ loading: false, error: null, data: d })

  const load = async () => {
    const hit = cacheGet('dashboardPage')
    if (hit) applyData(hit)
    else setState({ loading: true, error: null, data: null })
    try {
      const calls = [apiCall('getDashboardPage')]
      if (showCrm) calls.push(apiCall('getCrmDashboardSummary'))
      const [page, crm] = await Promise.all(calls)
      cacheSet('dashboardPage', page)
      applyData(page)
      if (showCrm) setCrmSummary(crm)
    } catch (e) {
      if (!hit) setState({ loading: false, error: e, data: null })
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (state.loading && !state.data) return <Spinner />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  const { projects, incoming, invoices, warnings } = state.data
  const running = projects.filter(p => isRunningStatus(p.status))
  const unpaid = incoming.filter(i => i.status === 'Nezaplatená')
  const unpaidSum = unpaid.reduce((s, i) => s + parseNum(i.amountGross), 0)
  const issuedUnpaid = invoices.filter(i => i.status !== 'Uhradená' && i.status !== 'Zaplatená')
  const today = toIsoDate(new Date().toISOString())
  const topWarnings = warnings.slice(0, 8)

  return (
    <div className="page">
      <header className="page-head">
        <h1>Prehľad</h1>
      </header>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Bežiace projekty</div>
          <div className="stat-value">{running.length}</div>
          <div className="stat-sub">{projects.length} celkom</div>
        </div>
        {showProjects && warnings.length > 0 && (
          <div className="stat-card">
            <div className="stat-label">Blízko limitu rozpočtu</div>
            <div className="stat-value budget-label-warn">{warnings.length}</div>
            <div className="stat-sub">≥ 90 % ceny zákazky</div>
          </div>
        )}
        {showFinance && (
          <>
            <div className="stat-card">
              <div className="stat-label">Neuhradené prijaté faktúry</div>
              <div className="stat-value">{fmtMoney(unpaidSum)}</div>
              <div className="stat-sub">{unpaid.length} ks</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Vydané faktúry — čaká sa na úhradu</div>
              <div className="stat-value">{issuedUnpaid.length}</div>
              <div className="stat-sub">z {invoices.length} vydaných</div>
            </div>
          </>
        )}
      </div>

      {showCrm && crmSummary && (
        <section className="card">
          <div className="card-head">
            <h2>CRM</h2>
            <Link to="/zakaznici/prehlad" className="btn btn-sm btn-secondary">Plný prehľad →</Link>
          </div>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Otvorené dopyty</div>
              <div className="stat-value">{crmSummary.openDealsCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pipeline (obchodné fázy)</div>
              <div className="stat-value stat-value-sm">{fmtMoney(crmSummary.pipelineValue)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Vážený pipeline</div>
              <div className="stat-value stat-value-sm">{fmtMoney(crmSummary.weightedPipelineValue)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Bez kontaktu 30+ dní</div>
              <div className="stat-value">{crmSummary.inactiveCustomers30Count}</div>
            </div>
            {isAdmin && crmSummary.orphanedCustomersCount > 0 && (
              <Link to="/zakaznici/prehlad" className="stat-card" style={{ textDecoration: 'none', borderColor: 'var(--gold-soft)' }}>
                <div className="stat-label">Osirelí zákazníci</div>
                <div className="stat-value budget-label-warn">{crmSummary.orphanedCustomersCount}</div>
                <div className="stat-sub">Bez obchodníka — priraďte v detaile</div>
              </Link>
            )}
          </div>
        </section>
      )}

      {showProjects && topWarnings.length > 0 && (
        <section className="card">
          <h2>Projekty blízko limitu rozpočtu</h2>
          <table className="table table-click">
            <thead>
              <tr><th>Projekt</th><th>Zákazník</th><th className="num">Náklady / cena</th><th className="num">%</th></tr>
            </thead>
            <tbody>
              {topWarnings.map(w => {
                const level = budgetLevel(w.costPercent)
                return (
                  <tr key={w.id}>
                    <td><Link to={'/projekty/' + w.id}>{w.name}</Link></td>
                    <td>{w.customer}</td>
                    <td className="num">{fmtMoney(w.totalCost)} / {fmtMoney(w.price)}</td>
                    <td className={'num' + (level === 'over' ? ' budget-label-over' : ' budget-label-warn')}>
                      {level === 'over' ? '🔴 ' : '⚠ '}{fmtPercent(w.costPercent)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}

      {showProjects && (
        <section className="card">
          <h2>Bežiace projekty</h2>
          {running.length === 0 ? (
            <p className="muted">Žiadne bežiace projekty.</p>
          ) : (
            <table className="table table-click">
              <thead>
                <tr><th>Projekt</th><th>ID</th><th>Zákazník</th><th>Stav</th><th>Termín</th><th className="num">Cena bez DPH</th></tr>
              </thead>
              <tbody>
                {running.map(p => {
                  const overdue = p.deadline && toIsoDate(p.deadline) < today
                  return (
                    <tr key={p.id} onClick={() => navigate('/projekty/' + p.id)} style={{ cursor: 'pointer' }}>
                      <td><Link to={'/projekty/' + p.id} onClick={e => e.stopPropagation()}>{p.name}</Link></td>
                      <td className="project-id">{p.id}</td>
                      <td>{p.customer}</td>
                      <td><StatusBadge status={p.status} /></td>
                      <td className={overdue ? 'overdue' : ''}>{fmtDate(p.deadline)}{overdue ? ' ⚠' : ''}</td>
                      <td className="num">{fmtMoney(projectPriceNet(p))}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>
      )}

      {showFinance && unpaid.length > 0 && (
        <section className="card">
          <h2>Najbližšie splatné prijaté faktúry</h2>
          <table className="table">
            <thead>
              <tr><th>Dodávateľ</th><th>Číslo</th><th>Splatnosť</th><th className="num">Suma</th></tr>
            </thead>
            <tbody>
              {[...unpaid]
                .sort((a, b) => toIsoDate(a.dueDate).localeCompare(toIsoDate(b.dueDate)))
                .slice(0, 6)
                .map(i => {
                  const overdue = toIsoDate(i.dueDate) && toIsoDate(i.dueDate) < today
                  return (
                    <tr key={i.id}>
                      <td>{i.vendor}</td>
                      <td>{i.invoiceNumber}</td>
                      <td className={overdue ? 'overdue' : ''}>{fmtDate(i.dueDate)}{overdue ? ' ⚠' : ''}</td>
                      <td className="num">{fmtMoney(i.amountGross)}</td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
