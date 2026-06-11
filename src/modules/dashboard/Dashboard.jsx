import { useEffect, useState } from 'react'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Spinner, ErrorBox, StatusBadge } from '../../components/ui'
import { fmtMoney, fmtDate, parseNum, isRunningStatus, toIsoDate } from '../../utils/format'

// Prehľad: bežiace projekty vždy; finančné čísla len s príslušnými právami.
export default function Dashboard() {
  const { can } = useAuth()
  const [state, setState] = useState({ loading: true, error: null, data: null })

  const showFinance = can('perm_invoices_full')
  const showProjects = can('perm_projects_read')

  const load = async () => {
    setState({ loading: true, error: null, data: null })
    try {
      const [projects, incoming, invoices] = await Promise.all([
        showProjects ? apiCall('getProjects') : Promise.resolve([]),
        showFinance ? apiCall('getIncomingInvoices') : Promise.resolve([]),
        showFinance ? apiCall('getInvoices') : Promise.resolve([]),
      ])
      setState({ loading: false, error: null, data: { projects, incoming, invoices } })
    } catch (e) {
      setState({ loading: false, error: e, data: null })
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (state.loading) return <Spinner />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  const { projects, incoming, invoices } = state.data
  const running = projects.filter(p => isRunningStatus(p.status))
  const unpaid = incoming.filter(i => i.status === 'Nezaplatená')
  const unpaidSum = unpaid.reduce((s, i) => s + parseNum(i.amountGross), 0)
  const issuedUnpaid = invoices.filter(i => i.status !== 'Uhradená' && i.status !== 'Zaplatená')
  const today = toIsoDate(new Date().toISOString())

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

      {showProjects && (
        <section className="card">
          <h2>Bežiace projekty</h2>
          {running.length === 0 ? (
            <p className="muted">Žiadne bežiace projekty.</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Projekt</th><th>Zákazník</th><th>Stav</th><th>Termín</th><th className="num">Cena</th></tr>
              </thead>
              <tbody>
                {running.map(p => {
                  const overdue = p.deadline && toIsoDate(p.deadline) < today
                  return (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.customer}</td>
                      <td><StatusBadge status={p.status} /></td>
                      <td className={overdue ? 'overdue' : ''}>{fmtDate(p.deadline)}{overdue ? ' ⚠' : ''}</td>
                      <td className="num">{fmtMoney(p.price)}</td>
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
