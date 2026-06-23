import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Spinner, ErrorBox } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { fmtDate, fmtMoney } from '../../utils/format'
import { phaseLabel } from './crmConstants'
import CrmTaskModal from './CrmTaskModal'
import DealDetailModal from './DealDetailModal'

function Section({ title, empty, children }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      {empty ? <p className="muted">{empty}</p> : children}
    </div>
  )
}

function TaskTable({ rows, onEdit, onComplete }) {
  return (
    <table className="table table-click">
      <thead><tr><th>Termín</th><th>Úloha</th><th>Zákazník</th><th>Priorita</th><th /></tr></thead>
      <tbody>
        {rows.map(t => (
          <tr key={t.id} onClick={() => onEdit(t)}>
            <td className={t._overdue ? 'overdue' : ''}>{fmtDate(t.dueDate)}</td>
            <td className="strong">{t.title}</td>
            <td><Link to={'/zakaznici/' + t.customerId} onClick={e => e.stopPropagation()}>{t.customerName}</Link></td>
            <td>{t.priority || '—'}</td>
            <td className="row-action" onClick={e => e.stopPropagation()}>
              <button className="icon-btn" title="Upraviť" onClick={() => onEdit(t)}>✎</button>{' '}
              <button className="btn btn-sm btn-secondary" onClick={() => onComplete(t.id)}>Hotovo</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function DealTable({ rows, overdueField, onOpen }) {
  return (
    <table className="table table-click">
      <thead><tr><th>Termín</th><th>Dopyt</th><th>Zákazník</th><th>Fáza</th><th>Hodnota</th><th /></tr></thead>
      <tbody>
        {rows.map(d => (
          <tr key={d.id} onClick={() => onOpen(d)}>
            <td className={overdueField && d[overdueField] && d._overdue ? 'overdue' : ''}>
              {fmtDate(overdueField ? d[overdueField] : d.nextActionDate)}
            </td>
            <td className="strong">{d.title}</td>
            <td><Link to={'/zakaznici/' + d.customerId} onClick={e => e.stopPropagation()}>{d.customerName}</Link></td>
            <td>{phaseLabel(d.phase)}</td>
            <td className="num">{d.estimatedValue ? fmtMoney(d.estimatedValue) : '—'}</td>
            <td className="row-action" onClick={e => e.stopPropagation()}>
              <button className="icon-btn" title="Upraviť dopyt" onClick={() => onOpen(d)}>✎</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function CrmToday() {
  const toast = useToast()
  const navigate = useNavigate()
  const { can } = useAuth()
  const isAdmin = can('perm_admin')
  const [mineOnly, setMineOnly] = useState(false)
  const [state, setState] = useState({ loading: true, error: null })
  const [data, setData] = useState(null)
  const [editTask, setEditTask] = useState(null)
  const [editDeals, setEditDeals] = useState([])
  const [viewDealId, setViewDealId] = useState(null)

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

  const openEditTask = async (task) => {
    try {
      const detail = await apiCall('getCustomerDetail', { id: task.customerId })
      setEditDeals(detail.deals || [])
      setEditTask(task)
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  const completeTask = async (id) => {
    try {
      const res = await apiCall('completeCrmTask', { id })
      toast('Úloha dokončená')
      load()
      if (res.task && window.confirm('Chcete zaznamenať novú aktivitu z tejto úlohy?')) {
        navigate('/zakaznici/' + res.task.customerId)
      }
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
        <p className="muted">Prehľad na {fmtDate(data.date)} — kliknutím upravíte úlohu alebo otvoríte dopyt (follow-up).</p>
        {isAdmin && (
          <label className="switch-row pipeline-filter">
            <input type="checkbox" checked={mineOnly} onChange={e => setMineOnly(e.target.checked)} />
            Len moje
          </label>
        )}
      </div>

      <Section title="Úlohy na dnes" empty={!data.tasksToday.length ? 'Dnes žiadne úlohy.' : null}>
        {data.tasksToday.length > 0 && (
          <TaskTable rows={data.tasksToday} onEdit={openEditTask} onComplete={completeTask} />
        )}
      </Section>

      <Section title="Oneskorené úlohy" empty={!tasksOverdue.length ? 'Žiadne oneskorené úlohy.' : null}>
        {tasksOverdue.length > 0 && (
          <TaskTable rows={tasksOverdue} onEdit={openEditTask} onComplete={completeTask} />
        )}
      </Section>

      <Section title="Follow-up dnes" empty={!data.followUpsToday.length ? 'Dnes žiadne plánované follow-upy.' : null}>
        {data.followUpsToday.length > 0 && (
          <DealTable rows={data.followUpsToday} overdueField="nextActionDate" onOpen={d => setViewDealId(d.id)} />
        )}
      </Section>

      <Section title="Oneskorené follow-upy" empty={!followOverdue.length ? 'Žiadne oneskorené follow-upy.' : null}>
        {followOverdue.length > 0 && (
          <DealTable rows={followOverdue} overdueField="nextActionDate" onOpen={d => setViewDealId(d.id)} />
        )}
      </Section>

      <Section title="Blížiace termíny (7 dní)" empty={!data.deadlinesSoon.length ? 'Žiadne blízke termíny klientov.' : null}>
        {data.deadlinesSoon.length > 0 && (
          <DealTable rows={data.deadlinesSoon} overdueField="clientDeadline" onOpen={d => setViewDealId(d.id)} />
        )}
      </Section>

      {editTask && (
        <CrmTaskModal
          customerId={editTask.customerId}
          deals={editDeals}
          task={editTask}
          onClose={() => setEditTask(null)}
          onSaved={() => { setEditTask(null); load() }}
        />
      )}
      {viewDealId && (
        <DealDetailModal
          dealId={viewDealId}
          onClose={() => setViewDealId(null)}
          onUpdated={load}
        />
      )}
    </>
  )
}
