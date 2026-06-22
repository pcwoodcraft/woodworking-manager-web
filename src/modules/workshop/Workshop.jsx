import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Spinner, ErrorBox, StatusBadge } from '../../components/ui'
import {
  fmtDate, fmtPercent, toIsoDate, priorityLabel, budgetLevel,
} from '../../utils/format'

const fmtH = (h) => h.toLocaleString('sk-SK', { maximumFractionDigits: 1 })

export default function Workshop() {
  const { can } = useAuth()
  const showCosts = can('perm_timesheets')
  const [state, setState] = useState({ loading: true, error: null })
  const [rows, setRows] = useState([])

  const load = async () => {
    setState({ loading: true, error: null })
    try {
      setRows(await apiCall('getWorkshopSchedule'))
      setState({ loading: false, error: null })
    } catch (e) {
      setState({ loading: false, error: e })
    }
  }

  useEffect(() => { load() }, [])

  if (state.loading) return <Spinner />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  const today = toIsoDate(new Date().toISOString())

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Týždeň vo výrobe</h1>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            Bežiace projekty zoradené podľa priority a termínu
          </p>
        </div>
      </header>

      <div className="card">
        {rows.length === 0 ? (
          <p className="muted">Žiadne bežiace projekty.</p>
        ) : (
          <table className="table table-click">
            <thead>
              <tr>
                <th>Projekt</th>
                <th>ID</th>
                <th>Zákazník</th>
                <th>Stav</th>
                <th>Priorita</th>
                <th>Termín</th>
                <th className="num">Hodiny</th>
                {showCosts && <th className="num">Náklady</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const overdue = r.deadline && toIsoDate(r.deadline) < today
                const level = budgetLevel(r.costPercent)
                const hours =
                  r.hoursEstimated > 0
                    ? fmtH(r.hoursActual) + ' / ' + fmtH(r.hoursEstimated)
                    : fmtH(r.hoursActual)
                return (
                  <tr key={r.id}>
                    <td className="strong">
                      <Link to={'/projekty/' + r.id}>{r.name}</Link>
                    </td>
                    <td className="project-id">{r.id}</td>
                    <td>{r.customer}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>{priorityLabel(r.priority)}</td>
                    <td className={overdue ? 'overdue' : ''}>
                      {fmtDate(r.deadline)}{overdue ? ' ⚠' : ''}
                    </td>
                    <td className="num">{hours}</td>
                    {showCosts && (
                      <td className={'num' + (level === 'over' ? ' budget-label-over' : level === 'warn' ? ' budget-label-warn' : '')}>
                        {r.costPercent != null ? fmtPercent(r.costPercent) : '—'}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
