import { lazy, Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { Spinner } from '../../components/ui'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import { fmtDate, fmtMoney } from '../../utils/format'
import SalesOwnerSelect from '../customers/SalesOwnerSelect'
import {
  ACTIVITY_TYPES, CRM_TASK_PRIORITIES, DEAL_PHASES, DEAL_SOURCES,
  dealStatusLabel, phaseLabel, sourceLabel,
  complaintStatusLabel, complaintResponsibilityLabel,
} from './crmConstants'

// CRM časť detailu zákazníka (Dopyty, Aktivity, Úlohy, Reklamácie). Jadro (`CustomerDetail`) ju
// načítava lenivo a len keď je modul `crm` aktívny — inštancia bez CRM tento JavaScript nestiahne
// (fáza 2b, Úloha C2). Modály sú lenivé aj tu: otvárajú sa až po kliknutí.
const DealDetailModal = lazy(() => import('./DealDetailModal'))
const ActivityModal = lazy(() => import('./ActivityModal'))
const CrmTaskModal = lazy(() => import('./CrmTaskModal'))
const ComplaintModal = lazy(() => import('./ComplaintModal'))

function DealModal({ customerId, deal, onClose, onSaved }) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    title: deal?.title || '',
    productType: deal?.productType || '',
    phase: deal?.phase || 'novy_dopyt',
    status: deal?.status || 'otvoreny',
    source: deal?.source || 'telefon',
    estimatedValue: deal?.estimatedValue || '',
    probability: deal?.probability || '',
    ownerEmail: deal?.ownerEmail || '',
    clientDeadline: deal?.clientDeadline || '',
    nextActionDate: deal?.nextActionDate || '',
    notes: deal?.notes || '',
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const save = async () => {
    setSaving(true)
    try {
      await apiCall(deal?.id ? 'updateDeal' : 'addDeal', {
        deal: { ...f, customerId, id: deal?.id },
      })
      toast(deal?.id ? 'Dopyt uložený' : 'Dopyt pridaný')
      onSaved()
    } catch (e) {
      toast(e.message, 'err')
      setSaving(false)
    }
  }

  return (
    <Modal title={deal?.id ? 'Upraviť dopyt' : 'Nový dopyt'} onClose={onClose} wide
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
        <button className="btn" onClick={save} disabled={saving}>Uložiť</button>
      </>}>
      <div className="form-grid">
        <label className="field span-2"><span>Názov</span><input value={f.title} onChange={set('title')} /></label>
        <label className="field"><span>Typ produktu</span>
          <select value={f.productType} onChange={set('productType')}>
            <option value="">—</option>
            {['schodisko', 'postel', 'dvere', 'stol', 'kuchyna', 'atyp', 'ine'].map(t =>
              <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="field"><span>Zdroj</span>
          <select value={f.source} onChange={set('source')}>
            <option value="">—</option>
            {DEAL_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label className="field"><span>Fáza</span>
          <select value={f.phase} onChange={set('phase')}>
            {DEAL_PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
        <label className="field"><span>Stav</span>
          <select value={f.status} onChange={set('status')}>
            <option value="otvoreny">Otvorený</option>
            <option value="prehrate">Prehrané</option>
          </select>
        </label>
        <label className="field"><span>Obchodník</span>
          <SalesOwnerSelect value={f.ownerEmail} onChange={v => setF({ ...f, ownerEmail: v })} />
        </label>
        <label className="field"><span>Hodnota (€)</span><input type="number" value={f.estimatedValue} onChange={set('estimatedValue')} /></label>
        <label className="field"><span>Pravdepodobnosť (%)</span><input type="number" value={f.probability} onChange={set('probability')} /></label>
        <label className="field"><span>Termín klienta</span><input type="date" value={f.clientDeadline} onChange={set('clientDeadline')} /></label>
        <label className="field"><span>Ďalšia akcia</span><input type="date" value={f.nextActionDate} onChange={set('nextActionDate')} /></label>
        <label className="field span-2"><span>Poznámky</span><textarea rows={2} value={f.notes} onChange={set('notes')} /></label>
      </div>
    </Modal>
  )
}

export default function CustomerCrmSections({
  customerId, deals = [], activities = [], crmTasks = [], complaints = [], contacts = [],
  projects = [], onReload,
}) {
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [modal, setModal] = useState(null)
  const [viewDealId, setViewDealId] = useState(null)

  useEffect(() => {
    const dealId = searchParams.get('deal')
    if (dealId) setViewDealId(dealId)
  }, [searchParams])

  const closeDealModal = () => {
    setViewDealId(null)
    if (searchParams.get('deal')) {
      const next = new URLSearchParams(searchParams)
      next.delete('deal')
      setSearchParams(next, { replace: true })
    }
  }

  const reload = () => onReload?.()
  const closeAndReload = () => { setModal(null); reload() }

  const completeTask = async (taskId) => {
    try {
      const res = await apiCall('completeCrmTask', { id: taskId })
      toast('Úloha dokončená')
      reload()
      if (res.task && window.confirm('Chcete zaznamenať novú aktivitu z tejto úlohy?')) {
        setModal({
          type: 'activity',
          initial: {
            type: res.task.type || 'hovor',
            subject: res.task.title,
            dealId: res.task.dealId || '',
            notes: res.task.description || '',
            nextStep: '',
          },
        })
      }
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  const deleteComplaint = async (complaintId) => {
    if (!window.confirm('Odstrániť reklamáciu zo zoznamu? (Záznam ostane v databáze.)')) return
    try {
      await apiCall('deleteComplaint', { id: complaintId })
      toast('Reklamácia odstránená')
      reload()
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  return (
    <>
      <div className="card">
        <div className="card-head">
          <h2>Dopyty</h2>
          <button className="btn btn-sm" onClick={() => setModal({ type: 'deal' })}>+ Dopyt</button>
        </div>
        {deals.length === 0 ? <p className="muted">Žiadne dopyty.</p> : (
          <table className="table">
            <thead><tr><th>ID</th><th>Názov</th><th>Fáza</th><th>Stav</th><th>Zdroj</th><th>Hodnota</th><th /></tr></thead>
            <tbody>
              {deals.map(d => (
                <tr key={d.id} className="table-click" onClick={() => setViewDealId(d.id)}>
                  <td className="project-id">{d.id}</td>
                  <td className="strong">{d.title}</td>
                  <td>{phaseLabel(d.phase)}</td>
                  <td>{dealStatusLabel(d.status)}</td>
                  <td>{sourceLabel(d.source)}</td>
                  <td className="num">{d.estimatedValue ? fmtMoney(d.estimatedValue) : '—'}</td>
                  <td className="row-action" onClick={e => e.stopPropagation()}>
                    <button className="icon-btn" onClick={() => setViewDealId(d.id)}>✎</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Aktivity</h2>
          <button className="btn btn-sm" onClick={() => setModal({ type: 'activity' })}>+ Aktivita</button>
        </div>
        {activities.length === 0 ? <p className="muted">Žiadne aktivity.</p> : (
          <table className="table">
            <thead><tr><th>Dátum</th><th>Typ</th><th>Téma</th><th>Výsledok</th><th>Ďalší krok</th><th /></tr></thead>
            <tbody>
              {activities.map(a => (
                <tr key={a.id} className="table-click" onClick={() => setModal({ type: 'activity', item: a })}>
                  <td>{fmtDate(a.date)}</td>
                  <td>{ACTIVITY_TYPES.find(t => t.value === a.type)?.label || a.type}</td>
                  <td>{a.subject || '—'}</td>
                  <td>{a.outcome || '—'}</td>
                  <td>{a.nextStep || '—'}</td>
                  <td className="row-action" onClick={e => e.stopPropagation()}>
                    <button className="icon-btn" onClick={() => setModal({ type: 'activity', item: a })}>✎</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Úlohy / follow-up</h2>
          <button className="btn btn-sm" onClick={() => setModal({ type: 'task' })}>+ Úloha</button>
        </div>
        {crmTasks.length === 0 ? <p className="muted">Žiadne úlohy.</p> : (
          <table className="table">
            <thead><tr><th>Termín</th><th>Názov</th><th>Typ</th><th>Priorita</th><th>Stav</th><th>Popis</th><th>Dopyt</th><th /></tr></thead>
            <tbody>
              {crmTasks.map(t => (
                <tr key={t.id} className="table-click" onClick={() => setModal({ type: 'task', item: t })}>
                  <td>{fmtDate(t.dueDate)}</td>
                  <td>{t.title}</td>
                  <td>{ACTIVITY_TYPES.find(x => x.value === t.type)?.label || t.type || '—'}</td>
                  <td>{CRM_TASK_PRIORITIES.find(p => p.value === t.priority)?.label || t.priority || '—'}</td>
                  <td>{t.status === 'hotova' ? 'Hotová' : 'Otvorená'}</td>
                  <td>{t.description || '—'}</td>
                  <td>{t.dealId ? (deals.find(d => d.id === t.dealId)?.title || t.dealId) : '—'}</td>
                  <td className="row-action" onClick={e => e.stopPropagation()}>
                    <button className="icon-btn" onClick={() => setModal({ type: 'task', item: t })}>✎</button>
                    {t.status !== 'hotova' && (
                      <button className="btn btn-sm btn-secondary" onClick={() => completeTask(t.id)}>Hotovo</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Reklamácie</h2>
          <button className="btn btn-sm" onClick={() => setModal({ type: 'complaint' })}>+ Reklamácia</button>
        </div>
        {complaints.length === 0 ? <p className="muted">Zatiaľ žiadna reklamácia.</p> : (
          <table className="table">
            <thead><tr><th>Dátum</th><th>Projekt</th><th>Popis</th><th>Stav</th><th>Zodpovednosť</th><th className="num">Náklady</th><th /></tr></thead>
            <tbody>
              {complaints.map(c => (
                <tr key={c.id} className="table-click" onClick={() => setModal({ type: 'complaint', item: c })}>
                  <td>{fmtDate(c.date)}</td>
                  <td>{c.projectId ? (projects.find(p => p.id === c.projectId)?.name || c.projectId) : '—'}</td>
                  <td>{c.description?.length > 60 ? c.description.slice(0, 60) + '…' : c.description}</td>
                  <td>{complaintStatusLabel(c.status)}</td>
                  <td>{complaintResponsibilityLabel(c.responsibility)}</td>
                  <td className="num">{c.cost ? fmtMoney(c.cost) : '—'}</td>
                  <td className="row-action" onClick={e => e.stopPropagation()}>
                    <button className="icon-btn" onClick={() => setModal({ type: 'complaint', item: c })}>✎</button>{' '}
                    <button className="icon-btn" onClick={() => deleteComplaint(c.id)}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal?.type === 'deal' && (
        <DealModal
          customerId={customerId}
          deal={modal.item}
          onClose={() => setModal(null)}
          onSaved={closeAndReload}
        />
      )}
      {modal?.type === 'activity' && (
        <Suspense fallback={<Spinner label="Načítavam…" />}>
          <ActivityModal
            customerId={customerId}
            deals={deals}
            contacts={contacts}
            activity={modal.item}
            initial={modal.initial}
            onClose={() => setModal(null)}
            onSaved={closeAndReload}
          />
        </Suspense>
      )}
      {modal?.type === 'task' && (
        <Suspense fallback={<Spinner label="Načítavam…" />}>
          <CrmTaskModal
            customerId={customerId}
            deals={deals}
            task={modal.item}
            onClose={() => setModal(null)}
            onSaved={closeAndReload}
          />
        </Suspense>
      )}
      {modal?.type === 'complaint' && (
        <Suspense fallback={<Spinner label="Načítavam…" />}>
          <ComplaintModal
            customerId={customerId}
            projects={projects}
            complaint={modal.item}
            onClose={() => setModal(null)}
            onSaved={closeAndReload}
          />
        </Suspense>
      )}
      {viewDealId && (
        <Suspense fallback={<Spinner label="Načítavam…" />}>
          <DealDetailModal
            dealId={viewDealId}
            onClose={closeDealModal}
            onUpdated={reload}
          />
        </Suspense>
      )}
    </>
  )
}
