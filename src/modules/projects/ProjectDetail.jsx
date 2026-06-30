import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { cacheGet, cacheSet, invalidateProjectCaches } from '../../api/cache'
import { useAuth } from '../../auth/AuthContext'
import { Spinner, ErrorBox, StatusBadge } from '../../components/ui'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import ProjectForm from './ProjectForm'
import { MaterialForm, IncomingInvoiceForm, AssignInvoiceModal } from './CostForms'
import CreateIssuedInvoiceForm, { TYPE_LABELS } from '../invoices/CreateIssuedInvoiceForm'
import InvoicePaymentModal from '../invoices/InvoicePaymentModal'

function displayInvoiceNumber(inv) {
  const n = inv.number || ''
  if (inv.type === 'zalohova') return n
  return n.replace(/^F/i, '')
}

function hasOstraForAdvance(invoices, advanceId) {
  return invoices.some(i => i.type === 'ostra' && String(i.relatedInvoiceId) === String(advanceId))
}
import ProjectFilesTab from './ProjectFilesTab'
import ManualTimeEntryForm from './ManualTimeEntryForm'
import ProjectEvaluationSection from './ProjectEvaluationSection'
import {
  fmtMoney, fmtDate, fmtPercent, parseNum, toIsoDate,
  PROJECT_STATUSES, normalizeStatus, statusLabel, budgetLevel,
  projectPriceNet, projectPriceGross,
} from '../../utils/format'

const CONFIRM_STATUSES = {
  zruseny: 'Naozaj označiť projekt ako zrušený?',
}

const PAYMENT_KIND_LABELS = { zaloha: 'Záloha', doplatok: 'Doplatok', faza: 'Fáza', ina: 'Iná' }

function invoiceStatusPillClass(status) {
  if (status === 'Uhradená') return 'pill-ok'
  if (status === 'Ciastočne uhradená') return 'pill-warn'
  return 'pill-warn'
}

function DeliveryConfirmModal({ remainingNet, openInvoices, onClose, onConfirm, saving }) {
  const [paidDate, setPaidDate] = useState(toIsoDate(new Date().toISOString()))
  const [invoiceId, setInvoiceId] = useState(openInvoices[0]?.id || '')
  return (
    <Modal
      title="Odovzdanie projektu — zostáva uhradiť"
      onClose={onClose}
      footer={<button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>}
    >
      <p>Zostáva uhradiť <b>{fmtMoney(remainingNet)}</b> (bez DPH). Ako chcete pokračovať?</p>
      {openInvoices.length > 0 && (
        <div className="form-grid" style={{ marginBottom: 12 }}>
          {openInvoices.length > 1 && (
            <label className="field span-2">
              <span>Doplatok priradiť k faktúre</span>
              <select value={invoiceId} onChange={e => setInvoiceId(e.target.value)}>
                {openInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>{inv.number} — zostáva {fmtMoney(inv.remainingNet)}</option>
                ))}
              </select>
            </label>
          )}
          {openInvoices.length === 1 && (
            <p className="muted">Doplatok sa priradí k faktúre <b>{openInvoices[0].number}</b>.</p>
          )}
          <label className="field">
            <span>Dátum úhrady</span>
            <input type="date" value={paidDate} max={toIsoDate(new Date().toISOString())} onChange={e => setPaidDate(e.target.value)} />
          </label>
        </div>
      )}
      <div className="btn-group" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
        <button className="btn" disabled={saving} onClick={() => onConfirm('pay', { paidDate, invoiceId: openInvoices.length ? invoiceId : '' })}>
          Odovzdať a zaznamenať úhradu zvyšku
        </button>
        <button className="btn btn-secondary" disabled={saving} onClick={() => {
          if (window.confirm('Projekt bude odovzdaný bez zaznamenania úhrady. Dopyt sa uzavrie ako vyhraný; obrat sa zvýši až po zaznamenaní platby. Pokračovať?')) {
            onConfirm('without')
          }
        }}>
          Odovzdať aj bez úhrady (zvyšok zostáva otvorený)
        </button>
      </div>
    </Modal>
  )
}

function ProjectManualPaymentModal({ project, onClose, onSaved }) {
  const toast = useToast()
  const [amount, setAmount] = useState('')
  const [paidDate, setPaidDate] = useState(toIsoDate(new Date().toISOString()))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const amt = parseNum(amount)
    if (!amt) { toast('Zadajte sumu', 'err'); return }
    setSaving(true)
    try {
      await apiCall('addProjectPayment', {
        payment: { projectId: project.id, amountNet: amt, paidDate, notes },
      })
      toast('Úhrada zaznamenaná')
      onSaved()
    } catch (e) {
      toast(e.message, 'err')
      setSaving(false)
    }
  }

  return (
    <Modal title="Ručná úhrada k projektu" onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Ukladá sa…' : 'Uložiť'}</button>
      </>}
    >
      <div className="form-grid">
        <label className="field"><span>Suma bez DPH (€)</span>
          <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
        </label>
        <label className="field"><span>Dátum platby</span>
          <input type="date" value={paidDate} max={toIsoDate(new Date().toISOString())} onChange={e => setPaidDate(e.target.value)} />
        </label>
        <label className="field span-2"><span>Poznámka</span>
          <input value={notes} onChange={e => setNotes(e.target.value)} />
        </label>
      </div>
    </Modal>
  )
}

const fmtH = (h) => h.toLocaleString('sk-SK', { maximumFractionDigits: 1 })

function groupEntries(entries) {
  const workers = new Map()
  entries.forEach(e => {
    const name = e.employeeName || 'Nezaradené záznamy'
    if (!workers.has(name)) workers.set(name, { hours: 0, cost: 0, tasks: new Map() })
    const w = workers.get(name)
    const h = parseNum(e.durationMin) / 60
    const c = parseNum(e.laborCost)
    w.hours += h
    w.cost += c
    const task = e.task || '—'
    if (!w.tasks.has(task)) w.tasks.set(task, { hours: 0, cost: 0, count: 0 })
    const t = w.tasks.get(task)
    t.hours += h
    t.cost += c
    t.count += 1
  })
  return [...workers.entries()]
    .map(([name, w]) => ({
      name, hours: w.hours, cost: w.cost,
      tasks: [...w.tasks.entries()]
        .map(([task, t]) => ({ task, ...t }))
        .sort((a, b) => b.hours - a.hours),
    }))
    .sort((a, b) => b.hours - a.hours)
}

function BudgetOverview({ summary, project }) {
  if (!summary) return null
  const { price, laborCost, materialCost, incomingCost, totalCost, costPercent } = summary
  const priceGross = project ? projectPriceGross(project) : 0
  const level = budgetLevel(costPercent)
  const pct = costPercent != null ? Math.min(costPercent, 100) : 0

  return (
    <div className="card">
      <h2>Plán vs. skutočnosť</h2>
      <div className="stat-grid" style={{ marginBottom: 0 }}>
        <div className="stat-card">
          <div className="stat-label">Cena zákazky (bez DPH)</div>
          <div className="stat-value">{fmtMoney(price)}</div>
          {priceGross > 0 && (
            <div className="stat-sub">s DPH: {fmtMoney(priceGross)}</div>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-label">Náklady spolu</div>
          <div className={'stat-value' + (level === 'over' ? ' budget-label-over' : level === 'warn' ? ' budget-label-warn' : '')}>
            {fmtMoney(totalCost)}
          </div>
          {costPercent != null && (
            <div className={'stat-sub' + (level === 'over' ? ' budget-label-over' : level === 'warn' ? ' budget-label-warn' : '')}>
              {level === 'over' ? '🔴 Nad rozpočtom — ' : level === 'warn' ? '⚠ Blízko limitu — ' : ''}
              {fmtPercent(costPercent)} ceny
            </div>
          )}
        </div>
      </div>
      {costPercent != null && price > 0 && (
        <div className="budget-bar" title={fmtPercent(costPercent)}>
          <div className={'budget-fill budget-fill-' + (level === 'none' ? 'ok' : level)} style={{ width: pct + '%' }} />
        </div>
      )}
      <div className="budget-breakdown">
        <div className="row"><span>Mzdové náklady</span><span>{fmtMoney(laborCost)}</span></div>
        <div className="row"><span>Materiál</span><span>{fmtMoney(materialCost)}</span></div>
        <div className="row"><span>Prijaté faktúry</span><span>{fmtMoney(incomingCost)}</span></div>
      </div>
    </div>
  )
}

export default function ProjectDetail() {
  const { id } = useParams()
  const toast = useToast()
  const { can } = useAuth()
  const canWrite = can('perm_projects_write')
  const canHours = can('perm_timesheets')
  const canInvoicesFull = can('perm_invoices_full')
  const canInvoicesAdd = can('perm_invoices_add')
  const canCostsAdd = can('perm_costs_add')
  const canSeeCosts = can('perm_costs_add') || can('perm_costs_full')
  const canFiles = can('perm_files')

  const [state, setState] = useState({ loading: true, error: null })
  const [data, setData] = useState(null)
  const [summary, setSummary] = useState(null)
  const [tab, setTab] = useState('prehlad')
  const [modal, setModal] = useState(null)
  const [savingStatus, setSavingStatus] = useState(false)
  const [openWorkers, setOpenWorkers] = useState({})
  const [invoiceLang, setInvoiceLang] = useState('sk')
  const [paymentSummary, setPaymentSummary] = useState(null)
  const [payments, setPayments] = useState([])
  const [evaluation, setEvaluation] = useState(null)
  const [deliveryModal, setDeliveryModal] = useState(null)

  const applyPage = (page) => {
    setData({
      projects: page.projects,
      customers: page.customers,
      entries: page.entries,
      invoices: page.invoices,
      incoming: page.incoming,
      material: page.material,
    })
    setSummary(page.summary)
    setPaymentSummary(page.paymentSummary || null)
    setPayments(page.payments || [])
    setEvaluation(page.evaluation || null)
  }

  const load = async () => {
    const cacheKey = 'projectDetail:' + id
    const hit = cacheGet(cacheKey)
    if (hit) {
      applyPage(hit)
      setState({ loading: false, error: null })
    } else {
      setState({ loading: true, error: null })
    }
    try {
      const page = await apiCall('getProjectDetailPage', { id })
      cacheSet(cacheKey, page)
      applyPage(page)
      setState({ loading: false, error: null })
    } catch (e) {
      if (!hit) setState({ loading: false, error: e })
    }
  }

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (state.loading && !data) return <Spinner />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  if (!data) return <Spinner />

  const project = data?.projects?.find(p => String(p.id) === String(id)) || data?.project
  if (!project) {
    return (
      <div className="page">
        <p className="muted">Projekt sa nenašiel. <Link to="/projekty">Späť na zoznam</Link></p>
      </div>
    )
  }

  const entries = data.entries
  const hoursTotal = entries.reduce((s, e) => s + parseNum(e.durationMin), 0) / 60
  const laborTotal = entries.reduce((s, e) => s + parseNum(e.laborCost), 0)
  const grouped = groupEntries(entries)
  const material = data.material.filter(m => String(m.projectId) === String(id))
  const materialTotal = material.reduce((s, m) => s + parseNum(m.amount), 0)
  const issued = data.invoices.filter(i => String(i.projectId) === String(id))
  const hasOstraInvoice = issued.some(i => i.type === 'ostra')
  const hasBalanceInvoice = issued.some(i => i.type === 'dokoncova')
  const received = data.incoming.filter(i => String(i.projectId) === String(id))
  const receivedTotal = received.reduce((s, i) => s + parseNum(i.amountGross), 0)

  const changeStatus = async (e) => {
    const status = e.target.value
    if (!status || status === normalizeStatus(project.status)) return
    if (CONFIRM_STATUSES[status] && !window.confirm(CONFIRM_STATUSES[status])) {
      e.target.value = normalizeStatus(project.status)
      return
    }
    if (status === 'odovzdany' && paymentSummary && paymentSummary.remainingNet > 0.01) {
      e.target.value = normalizeStatus(project.status)
      setDeliveryModal({
        remainingNet: paymentSummary.remainingNet,
        openInvoices: paymentSummary.openInvoices || [],
      })
      return
    }
    await doUpdateStatus(status)
  }

  const doUpdateStatus = async (status, opts) => {
    setSavingStatus(true)
    try {
      const payload = { id: project.id, status, ...(opts || {}) }
      await apiCall('updateProjectStatus', payload)
      toast('Stav zmenený na „' + statusLabel(status) + '“')
      setDeliveryModal(null)
      await reload()
    } catch (err) {
      toast('Nepodarilo sa zmeniť stav: ' + err.message, 'err')
    } finally {
      setSavingStatus(false)
    }
  }

  const confirmDelivery = (mode, extra) => {
    if (mode === 'pay') {
      doUpdateStatus('odovzdany', {
        recordRemainingOnDelivery: true,
        paidDate: extra.paidDate,
        invoiceId: extra.invoiceId || undefined,
      })
    } else if (mode === 'without') {
      doUpdateStatus('odovzdany', { deliverWithoutFullPayment: true })
    }
  }

  const reload = () => { invalidateProjectCaches(id); return load() }

  const deleteMaterial = async (item) => {
    if (!window.confirm('Zmazať položku „' + item.name + '“?')) return
    try {
      await apiCall('deleteMaterialItem', { id: item.id })
      toast('Materiál zmazaný')
      await reload()
    } catch (err) {
      toast('Nepodarilo sa zmazať: ' + err.message, 'err')
    }
  }

  const closeAndReload = () => { setModal(null); reload() }

  const issueAdvance = async () => {
    const pct = window.prompt('Percento zálohy z ceny zákazky:', '50')
    if (pct == null) return
    const advancePercent = parseNum(pct)
    if (!advancePercent || advancePercent <= 0 || advancePercent > 100) {
      toast('Zadajte percento medzi 1 a 100', 'err')
      return
    }
    if (!window.confirm('Vystaviť zálohovú faktúru (' + advancePercent + ' %)?')) return
    try {
      const r = await apiCall('createProjectAdvanceInvoice', { projectId: project.id, language: invoiceLang, advancePercent })
      toast('Zálohová faktúra ' + (r.invoice?.number || '') + ' vystavená')
      reload()
    } catch (e) {
      toast('Nepodarilo sa vystaviť: ' + e.message, 'err')
    }
  }

  const issueBalance = async () => {
    if (!hasOstraInvoice) {
      toast('Najprv vystavte ostrú faktúru k uhradenej zálohe', 'err')
      return
    }
    if (!window.confirm('Vystaviť dofakturáciu? Na faktúre bude celá suma zákazky a mínusová položka prijatej zálohy.')) return
    try {
      const r = await apiCall('createProjectBalanceInvoice', { projectId: project.id, language: invoiceLang })
      toast('Dofakturácia ' + (r.invoice?.number || '') + ' vystavená')
      reload()
    } catch (e) {
      toast('Nepodarilo sa vystaviť: ' + e.message, 'err')
    }
  }

  const createOstra = async (inv) => {
    if (!window.confirm('Vystaviť ostrú faktúru k zálohe ' + inv.number + '?')) return
    try {
      const r = await apiCall('createOstraInvoiceFromAdvance', { advanceInvoiceId: inv.id, language: invoiceLang })
      toast('Ostrá faktúra ' + (r.invoice?.number || '') + ' vystavená')
      reload()
    } catch (e) {
      toast('Nepodarilo sa vystaviť: ' + e.message, 'err')
    }
  }

  const payInvoiceRemaining = async (inv) => {
    const rem = parseNum(inv.remainingNet)
    if (rem <= 0.01) {
      toast('Faktúra je uhradená')
      return
    }
    try {
      await apiCall('addInvoicePayment', {
        invoiceId: inv.id,
        amountNet: rem,
        paidDate: toIsoDate(new Date().toISOString()),
      })
      toast('Zvyšok faktúry uhradený')
      reload()
    } catch (e) {
      toast('Nepodarilo sa uložiť: ' + e.message, 'err')
    }
  }

  const deletePayment = async (pay) => {
    if (!window.confirm('Zmazať úhradu ' + fmtMoney(pay.amountNet) + ' z ' + fmtDate(pay.paidDate) + '?')) return
    try {
      await apiCall('deleteProjectPayment', { id: pay.id })
      toast('Úhrada zmazaná')
      reload()
    } catch (e) {
      toast('Nepodarilo sa zmazať: ' + e.message, 'err')
    }
  }

  const canInvoices = canInvoicesFull || canInvoicesAdd
  const norm = normalizeStatus(project.status)
  const overdue = project.deadline && toIsoDate(project.deadline) < toIsoDate(new Date().toISOString())
    && norm !== 'odovzdany' && norm !== 'zruseny'

  return (
    <div className="page">
      <div className="breadcrumb"><Link to="/projekty">Projekty</Link> / {project.name}</div>
      <header className="page-head">
        <div>
          <h1>{project.name}</h1>
          <div className="project-id">{project.id}</div>
          <div className="muted">{project.customer}</div>
        </div>
        <div className="head-actions">
          {canWrite ? (
            <select className="status-select" value={norm} onChange={changeStatus} disabled={savingStatus}>
              {PROJECT_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          ) : (
            <StatusBadge status={project.status} />
          )}
          {canWrite && <button className="btn" onClick={() => setModal('edit')}>✎ Upraviť projekt</button>}
        </div>
      </header>

      <div className="tabs">
        <button className={tab === 'prehlad' ? 'tab active' : 'tab'} onClick={() => setTab('prehlad')}>Prehľad</button>
        {canHours && <button className={tab === 'hodiny' ? 'tab active' : 'tab'} onClick={() => setTab('hodiny')}>Hodiny</button>}
        <button className={tab === 'naklady' ? 'tab active' : 'tab'} onClick={() => setTab('naklady')}>Faktúry a náklady</button>
        {canFiles && <button className={tab === 'subory' ? 'tab active' : 'tab'} onClick={() => setTab('subory')}>Súbory</button>}
      </div>

      {tab === 'prehlad' && (
        <>
          <BudgetOverview summary={summary} project={project} />
          {paymentSummary && (
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-label">Uhradené (bez DPH)</div>
                <div className="stat-value">{fmtMoney(paymentSummary.paidNet)}</div>
                <div className="stat-sub">z {fmtMoney(paymentSummary.contractNet)} ceny zákazky</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Zostáva</div>
                <div className={'stat-value' + (paymentSummary.remainingNet > 0.01 ? ' budget-label-warn' : '')}>
                  {fmtMoney(paymentSummary.remainingNet)}
                </div>
                {norm === 'odovzdany' && paymentSummary.remainingNet > 0.01 && (
                  <div className="stat-sub budget-label-warn">Projekt odovzdaný — doplatok ešte neprišiel</div>
                )}
              </div>
            </div>
          )}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Stav</div>
              <div className="stat-value-sm"><StatusBadge status={project.status} /></div>
              <div className="stat-sub">Termín: <span className={overdue ? 'overdue' : ''}>{fmtDate(project.deadline)}{overdue ? ' ⚠' : ''}</span></div>
            </div>
            {canHours && (
              <div className="stat-card">
                <div className="stat-label">Odpracované</div>
                <div className="stat-value">{fmtH(summary?.hoursActual ?? hoursTotal)} h</div>
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
          {norm === 'odovzdany' && (
            <ProjectEvaluationSection evaluation={evaluation} canSeeCosts={canSeeCosts} />
          )}
        </>
      )}

      {tab === 'hodiny' && canHours && (
        <div className="card">
          <div className="card-head">
            <h2>Odpracované hodiny</h2>
            <button className="btn btn-sm" onClick={() => setModal('manualHours')}>+ Pridať hodiny</button>
          </div>
          {grouped.length === 0 ? <p className="muted">Zatiaľ žiadne záznamy hodín.</p> : (
            <table className="table">
              <thead>
                <tr><th>Pracovník / činnosť</th><th className="num">Hodiny</th><th className="num">Mzdový náklad</th></tr>
              </thead>
              {grouped.map(w => (
                <tbody key={w.name}>
                  <tr
                    className="worker-row"
                    onClick={() => setOpenWorkers({ ...openWorkers, [w.name]: !openWorkers[w.name] })}
                  >
                    <td className="strong">
                      <span className="caret">{openWorkers[w.name] ? '▾' : '▸'}</span> {w.name}
                    </td>
                    <td className="num strong">{fmtH(w.hours)}</td>
                    <td className="num strong">{fmtMoney(w.cost)}</td>
                  </tr>
                  {openWorkers[w.name] && w.tasks.map(t => (
                    <tr key={w.name + t.task} className="task-row">
                      <td className="task-name">{t.task}</td>
                      <td className="num">{fmtH(t.hours)}</td>
                      <td className="num">{fmtMoney(t.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              ))}
              <tfoot>
                <tr>
                  <td className="strong">Spolu</td>
                  <td className="num strong">{fmtH(hoursTotal)}</td>
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
            <div className="card-head">
              <h2>Materiál ({material.length}) — spolu {fmtMoney(materialTotal)}</h2>
              {canCostsAdd && <button className="btn btn-sm" onClick={() => setModal('material')}>+ Pridať materiál</button>}
            </div>
            {material.length === 0 ? <p className="muted">Žiadny materiál.</p> : (
              <table className="table">
                <thead><tr><th>Položka</th><th>Kategória</th><th className="num">Suma</th>{canCostsAdd && <th />}</tr></thead>
                <tbody>
                  {material.map(m => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td>{m.category}</td>
                      <td className="num">{fmtMoney(m.amount)}</td>
                      {canCostsAdd && (
                        <td className="row-action">
                          <button className="icon-btn" title="Upraviť" onClick={() => setModal({ type: 'material', item: m })}>✎</button>
                          <button className="icon-btn" title="Zmazať" onClick={() => deleteMaterial(m)}>✕</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {canInvoices && (
            <div className="card">
              <div className="card-head">
                <h2>Úhrady od zákazníka ({payments.length})</h2>
                {canInvoicesAdd && (
                  <button className="btn btn-sm" onClick={() => setModal({ type: 'projectPayment' })}>+ Úhrada</button>
                )}
              </div>
              {norm === 'odovzdany' && paymentSummary?.remainingNet > 0.01 && (
                <p className="muted budget-label-warn" style={{ marginBottom: 10 }}>
                  Projekt je odovzdaný; zostáva uhradiť {fmtMoney(paymentSummary.remainingNet)}.
                </p>
              )}
              {payments.length === 0 ? <p className="muted">Zatiaľ žiadne zaznamenané úhrady.</p> : (
                <table className="table">
                  <thead>
                    <tr><th>Dátum</th><th>Suma</th><th>Typ</th><th>Faktúra</th><th>Poznámka</th>{canInvoicesAdd && <th />}</tr>
                  </thead>
                  <tbody>
                    {payments.map(pay => {
                      const inv = issued.find(i => String(i.id) === String(pay.invoiceId))
                      return (
                        <tr key={pay.id}>
                          <td>{fmtDate(pay.paidDate)}</td>
                          <td className="num">{fmtMoney(pay.amountNet)}</td>
                          <td>{PAYMENT_KIND_LABELS[pay.kind] || pay.kind || '—'}</td>
                          <td>{inv ? displayInvoiceNumber(inv) : (pay.invoiceId ? pay.invoiceId : '—')}</td>
                          <td className="muted">{pay.notes || '—'}</td>
                          {canInvoicesAdd && (
                            <td className="row-action">
                              <button className="icon-btn" title="Zmazať" onClick={() => deletePayment(pay)}>✕</button>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {canInvoicesFull && (
            <div className="card">
              <div className="card-head">
                <h2>Prijaté faktúry ({received.length}) — spolu {fmtMoney(receivedTotal)}</h2>
                <div className="btn-group">
                  {canInvoicesAdd && <button className="btn btn-sm btn-secondary" onClick={() => setModal('assign')}>Priradiť existujúcu</button>}
                  <button className="btn btn-sm" onClick={() => setModal('incoming')}>+ Nová faktúra</button>
                </div>
              </div>
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
          )}

          {canInvoices && (
            <div className="card">
              <div className="card-head">
                <h2>Vydané faktúry ({issued.length})</h2>
                {canInvoicesAdd && (
                  <div className="btn-group" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <label className="field" style={{ margin: 0, minWidth: 140 }}>
                      <span style={{ fontSize: '0.85em' }}>Jazyk faktúry</span>
                      <select value={invoiceLang} onChange={e => setInvoiceLang(e.target.value)}>
                        <option value="sk">Slovenčina</option>
                        <option value="en">English</option>
                      </select>
                    </label>
                    <button className="btn btn-sm btn-secondary" onClick={issueAdvance}>Zálohová faktúra</button>
                    <button className="btn btn-sm btn-secondary" onClick={issueBalance}
                      disabled={!hasOstraInvoice || hasBalanceInvoice}
                      title={!hasOstraInvoice ? 'Najprv ostrá faktúra k zálohe' : hasBalanceInvoice ? 'Dofakturácia už existuje' : ''}
                    >Dofakturovať</button>
                    <button className="btn btn-sm" onClick={() => setModal('issued')}>+ Vystaviť faktúru</button>
                  </div>
                )}
              </div>
              {issued.length === 0 ? <p className="muted">Žiadne vydané faktúry k projektu.</p> : (
                <table className="table">
                  <thead><tr><th>Číslo</th><th>Typ</th><th>Vystavená</th><th>Stav</th><th className="num">Suma</th><th className="num">Uhradené</th><th /></tr></thead>
                  <tbody>
                    {issued.map(i => {
                      const st = i.paymentStatus || i.status || 'Neuhradená'
                      const isOstra = i.type === 'ostra'
                      const advance = isOstra ? issued.find(a => String(a.id) === String(i.relatedInvoiceId)) : null
                      return (
                      <tr key={i.id}>
                        <td>
                          {i.driveLink
                            ? <a href={i.driveLink} target="_blank" rel="noreferrer">{displayInvoiceNumber(i)}</a>
                            : displayInvoiceNumber(i)}
                        </td>
                        <td>{TYPE_LABELS[i.type] || i.type || '—'}</td>
                        <td>{fmtDate(i.issueDate)}</td>
                        <td>
                          {isOstra ? (
                            <span className={'pill ' + invoiceStatusPillClass(st)} title={advance ? 'Zrkadlí stav zálohy ' + advance.number : ''}>
                              {st}{advance ? ' (záloha ' + displayInvoiceNumber(advance) + ')' : ''}
                            </span>
                          ) : (
                            <span className={'pill ' + invoiceStatusPillClass(st)}>{st}</span>
                          )}
                        </td>
                        <td className="num">{fmtMoney(i.amountNet || i.amount)}</td>
                        <td className="num">{isOstra ? '—' : fmtMoney(i.paidNet || 0)}</td>
                        <td className="row-action">
                          {!isOstra && canInvoicesAdd && parseNum(i.remainingNet) > 0.01 && (
                            <>
                              <button className="btn btn-sm btn-secondary" onClick={() => setModal({ type: 'invoicePayment', inv: i })}>+ Úhrada</button>
                              <button className="btn btn-sm" style={{ marginLeft: 4 }} onClick={() => payInvoiceRemaining(i)}>Uhradiť zvyšok</button>
                            </>
                          )}
                          {i.type === 'zalohova' && st === 'Uhradená' && !hasOstraForAdvance(data.invoices, i.id) && (
                            <button className="btn btn-sm btn-secondary" onClick={() => createOstra(i)}>Ostrá faktúra</button>
                          )}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'subory' && canFiles && (
        <ProjectFilesTab project={project} onProjectUpdated={load} />
      )}

      {modal === 'manualHours' && (
        <ManualTimeEntryForm project={project} onClose={() => setModal(null)} onSaved={closeAndReload} />
      )}
      {modal === 'edit' && (
        <ProjectForm project={project} customers={data.customers} onClose={() => setModal(null)} onSaved={closeAndReload} />
      )}
      {(modal === 'material' || modal?.type === 'material') && (
        <MaterialForm
          project={project}
          item={modal?.item}
          onClose={() => setModal(null)}
          onSaved={closeAndReload}
        />
      )}
      {modal === 'incoming' && <IncomingInvoiceForm project={project} onClose={() => setModal(null)} onSaved={closeAndReload} />}
      {modal === 'issued' && (
        <CreateIssuedInvoiceForm
          project={project}
          customers={data.customers}
          initialLanguage={invoiceLang}
          onClose={() => setModal(null)}
          onSaved={closeAndReload}
        />
      )}
      {modal?.type === 'invoicePayment' && (
        <InvoicePaymentModal
          invoice={modal.inv}
          onClose={() => setModal(null)}
          onSaved={closeAndReload}
        />
      )}
      {modal?.type === 'projectPayment' && (
        <ProjectManualPaymentModal project={project} onClose={() => setModal(null)} onSaved={closeAndReload} />
      )}
      {deliveryModal && (
        <DeliveryConfirmModal
          remainingNet={deliveryModal.remainingNet}
          openInvoices={deliveryModal.openInvoices}
          onClose={() => setDeliveryModal(null)}
          onConfirm={confirmDelivery}
          saving={savingStatus}
        />
      )}
      {modal === 'assign' && (
        <AssignInvoiceModal project={project} incoming={data.incoming} onClose={() => setModal(null)} onSaved={closeAndReload} />
      )}
    </div>
  )
}
