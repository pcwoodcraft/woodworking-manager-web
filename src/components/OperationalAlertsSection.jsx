import { Link } from 'react-router-dom'
import { fmtDate } from '../utils/format'

const TYPE_LABELS = {
  advance_missing: 'Chýba záloha',
  advance_unpaid: 'Neuhradená záloha',
  project_deadline: 'Termín projektu',
  deal_stale: 'Dopyt bez aktivity',
}

function severityClass(severity) {
  if (severity === 'error') return 'overdue'
  if (severity === 'warn') return 'budget-label-warn'
  return 'muted'
}

export default function OperationalAlertsSection({ alerts, title, emptyText, limit }) {
  const rows = limit ? (alerts || []).slice(0, limit) : (alerts || [])
  if (!rows.length) {
    return (
      <section className="card">
        <h2>{title || 'Vyžaduje pozornosť'}</h2>
        <p className="muted">{emptyText || 'Všetko v poriadku — žiadne pripomienky.'}</p>
      </section>
    )
  }

  return (
    <section className="card">
      <h2>{title || 'Vyžaduje pozornosť'}</h2>
      <table className="table table-click">
        <thead>
          <tr><th>Typ</th><th>Popis</th><th>Termín</th><th /></tr>
        </thead>
        <tbody>
          {rows.map(a => (
            <tr key={a.id}>
              <td className={severityClass(a.severity)}>{TYPE_LABELS[a.type] || a.type}</td>
              <td>
                <div className="strong">{a.title}</div>
                <div className="muted">{a.detail}</div>
              </td>
              <td>{fmtDate(a.dueDate)}</td>
              <td>
                {a.linkPath && (
                  <Link to={a.linkPath} className="btn btn-sm btn-secondary">Otvoriť</Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {limit && alerts.length > limit && (
        <p className="muted" style={{ marginTop: 8 }}>+ ďalších {alerts.length - limit} pripomienok</p>
      )}
    </section>
  )
}
