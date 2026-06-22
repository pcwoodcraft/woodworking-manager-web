import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Spinner, ErrorBox } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { fmtDate, fmtMoney } from '../../utils/format'
import { phaseLabel } from './crmConstants'

function Section({ title, empty, children }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      {empty ? <p className="muted">{empty}</p> : children}
    </div>
  )
}

function TaskTable({ rows, onComplete }) {
  return (
    <table className="table">
      <thead><tr><th>Termín</th><th>Úloha</th><th>Zákazník</th><th /></tr></thead>
      <tbody>
        {rows.map(t => (
          <tr key={t.id}>
            <td className={t._overdue ? 'overdue' : ''}>{fmtDate(t.dueDate)}</td>
            <td>{t.title}</td>
            <td><Link to={'/zakaznici/' + t.customerId}>{t.customerName}</Link></td>
            <td className="row-action">
              <button className="btn btn-sm btn-secondary" onClick={() => onComplete(t.id)}>Hotovo</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function DealTable({ rows, overdueField }) {
  return (
    <table className="table">
      <thead><tr><th>Termín</th><th>Dopyt</th><th>Zákazník</th><th>Fáza</th><th>Hodnota</th></tr></thead>
      <tbody>
        {rows.map(d => (
          <tr key={d.id}>
            <td className={overdueField && d[overdueField] && d._overdue ? 'overdue' : ''}>
              {fmtDate(overdueField ? d[overdueField] : d.nextActionDate)}
            </td>
            <td className="strong">{d.title}</td>
            <td><Link to={'/zakaznici/' + d.customerId}>{d.customerName}</Link></td>
            <td>{phaseLabel(d.phase)}</td>
            <td className="num">{d.estimatedValue ? fmtMoney(d.estimatedValue) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function CrmToday() {
  const toast = useToast()
  const { can } = useAuth()
  const isAdmin = can('perm_admin')
  const [mineOnly, setMineOnly] = useState(false)
  const [state, setState] = useState({ loading: true, error: null })
  const [data, setData] = useState(null)

  const load = useCallback(async () => {
    setState({ loading: true, error: null })
    try {
      setData(await apiCall('getCrmToday', { mineOnly: mineOnly || undefined }))
      setState({ loading: false, error: null })
    } catch (e) {
      setState({ loading: false, error: e })
    }
  }, [mineOnly])

  useEffect(() => { load() }, [load])

  const completeTask = async (id) => {
    try {
      await apiCall('completeCrmTask', { id })
      toast('Úloha dokončená')
      load()
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  if (state.loading) return <Spinner />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  if (!data) return null

  const tasksOverdue = data.tasksOverdue.map(t => ({ ...t, _overdue: true }))
  const followOverdue = data.followUpsOverdue.map(d => ({ ...d, _overdue: true }))

  return (
    <>
      <div className="pipeline-toolbar">
        <p className="muted">Prehľad na {fmtDate(data.date)} — úlohy, follow-upy a blížiace termíny.</p>
        {isAdmin && (
          <label className="switch-row pipeline-filter">
            <input type="checkbox" checked={mineOnly} onChange={e => setMineOnly(e.target.checked)} />
            Len moje
          </label>
        )}
      </div>

      <Section title="Úlohy na dnes" empty={!data.tasksToday.length ? 'Dnes žiadne úlohy.' : null}>
        {data.tasksToday.length > 0 && (
          <TaskTable rows={data.tasksToday} onComplete={completeTask} />
        )}
      </Section>

      <Section title="Oneskorené úlohy" empty={!tasksOverdue.length ? 'Žiadne oneskorené úlohy.' : null}>
        {tasksOverdue.length > 0 && (
          <TaskTable rows={tasksOverdue} onComplete={completeTask} />
        )}
      </Section>

      <Section title="Follow-up dnes" empty={!data.followUpsToday.length ? 'Dnes žiadne plánované follow-upy.' : null}>
        {data.followUpsToday.length > 0 && (
          <DealTable rows={data.followUpsToday} overdueField="nextActionDate" />
        )}
      </Section>

      <Section title="Oneskorené follow-upy" empty={!followOverdue.length ? 'Žiadne oneskorené follow-upy.' : null}>
        {followOverdue.length > 0 && (
          <DealTable rows={followOverdue} overdueField="nextActionDate" />
        )}
      </Section>

      <Section title="Blížiace termíny (7 dní)" empty={!data.deadlinesSoon.length ? 'Žiadne blízke termíny klientov.' : null}>
        {data.deadlinesSoon.length > 0 && (
          <DealTable rows={data.deadlinesSoon} overdueField="clientDeadline" />
        )}
      </Section>
    </>
  )
}
