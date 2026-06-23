import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Spinner, ErrorBox, StatusBadge } from '../../components/ui'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import { fmtDate, fmtMoney } from '../../utils/format'
import CustomerForm from './CustomerForm'
import DealDetailModal from './DealDetailModal'
import {
  ACTIVITY_TYPES, CRM_TASK_PRIORITIES, DEAL_PHASES, DEAL_SOURCES,
  customerDisplayName, customerStatusLabel, customerTypeLabel, contactTypeLabel,
  dealStatusLabel, phaseLabel, sourceLabel,
} from './crmConstants'
import SalesOwnerSelect from './SalesOwnerSelect'

function ContactModal({ customerId, contact, onClose, onSaved }) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    name: contact?.name || '',
    role: contact?.role || '',
    phone: contact?.phone || '',
    email: contact?.email || '',
    contactType: contact?.contactType || 'hlavny',
    preferredContact: contact?.preferredContact || '',
    decisionRole: contact?.decisionRole || '',
    notes: contact?.notes || '',
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const save = async () => {
    if (!f.name.trim()) { toast('Vyplňte meno', 'err'); return }
    setSaving(true)
    try {
      const payload = { contact: { ...f, customerId, id: contact?.id } }
      await apiCall(contact?.id ? 'updateContact' : 'addContact', payload)
      toast(contact?.id ? 'Kontakt uložený' : 'Kontakt pridaný')
      onSaved()
    } catch (e) {
      toast(e.message, 'err')
      setSaving(false)
    }
  }

  return (
    <Modal title={contact?.id ? 'Upraviť kontakt' : 'Nový kontakt'} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
        <button className="btn" onClick={save} disabled={saving}>Uložiť</button>
      </>}>
      <div className="form-grid">
        <label className="field span-2"><span>Meno</span><input value={f.name} onChange={set('name')} /></label>
        <label className="field"><span>Pozícia / rola</span><input value={f.role} onChange={set('role')} /></label>
        <label className="field"><span>Typ kontaktu</span>
          <select value={f.contactType} onChange={set('contactType')}>
            <option value="hlavny">Hlavný</option>
            <option value="technicky">Technický</option>
            <option value="fakturacny">Fakturačný</option>
            <option value="ine">Iné</option>
          </select>
        </label>
        <label className="field"><span>Telefón</span><input value={f.phone} onChange={set('phone')} /></label>
        <label className="field"><span>Email</span><input type="email" value={f.email} onChange={set('email')} /></label>
        <label className="field span-2"><span>Preferovaný spôsob kontaktu</span>
          <input value={f.preferredContact} onChange={set('preferredContact')} placeholder="telefón / email / osobne" />
        </label>
        <label className="field span-2"><span>Rozhodovacia právomoc</span>
          <input value={f.decisionRole} onChange={set('decisionRole')} placeholder="rozhoduje / odporúča / vykonáva" />
        </label>
        <label className="field span-2"><span>Poznámky</span><textarea rows={2} value={f.notes} onChange={set('notes')} /></label>
      </div>
    </Modal>
  )
}

function ActivityModal({ customerId, deals, contacts, initial, onClose, onSaved }) {
  const toast = useToast()
  const { me } = useAuth()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    type: initial?.type || 'hovor',
    subject: initial?.subject || '',
    outcome: initial?.outcome || '',
    nextStep: initial?.nextStep || '',
    followUpDate: initial?.followUpDate || '',
    followUpPriority: initial?.followUpPriority || 'normalna',
    dealId: initial?.dealId || '',
    contactId: initial?.contactId || '',
    contactName: initial?.contactName || '',
    ownerEmail: me?.email || '',
    notes: initial?.notes || '',
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const onContactChange = (contactId) => {
    const c = contacts.find(x => String(x.id) === String(contactId))
    setF({ ...f, contactId, contactName: c ? c.name : '' })
  }

  const save = async () => {
    if (!f.type) { toast('Vyberte typ', 'err'); return }
    setSaving(true)
    try {
      await apiCall('addActivity', {
        activity: { ...f, customerId, date: new Date().toISOString().slice(0, 10) },
        followUpDate: f.followUpDate || undefined,
        followUpPriority: f.followUpPriority,
      })
      toast(f.followUpDate && f.nextStep.trim() ? 'Aktivita a follow-up úloha pridané' : 'Aktivita pridaná')
      onSaved()
    } catch (e) {
      toast(e.message, 'err')
      setSaving(false)
    }
  }

  return (
    <Modal title="Nová aktivita" onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
        <button className="btn" onClick={save} disabled={saving}>Uložiť</button>
      </>}>
      <div className="form-grid">
        <label className="field"><span>Typ</span>
          <select value={f.type} onChange={set('type')}>
            {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <label className="field"><span>Dopyt (voliteľné)</span>
          <select value={f.dealId} onChange={set('dealId')}>
            <option value="">—</option>
            {deals.map(d => <option key={d.id} value={d.id}>{d.title || d.id}</option>)}
          </select>
        </label>
        <label className="field span-2"><span>Téma</span><input value={f.subject} onChange={set('subject')} /></label>
        <label className="field"><span>Kontaktná osoba</span>
          <select value={f.contactId} onChange={e => onContactChange(e.target.value)}>
            <option value="">—</option>
            {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="field"><span>Výsledok</span><input value={f.outcome} onChange={set('outcome')} /></label>
        <label className="field span-2"><span>Ďalší krok</span><input value={f.nextStep} onChange={set('nextStep')} /></label>
        <label className="field"><span>Termín follow-up</span>
          <input type="date" value={f.followUpDate} onChange={set('followUpDate')} />
        </label>
        <label className="field"><span>Priorita úlohy</span>
          <select value={f.followUpPriority} onChange={set('followUpPriority')}>
            {CRM_TASK_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
        <label className="field span-2"><span>Poznámky</span><textarea rows={2} value={f.notes} onChange={set('notes')} /></label>
      </div>
    </Modal>
  )
}

function CrmTaskModal({ customerId, deals, onClose, onSaved }) {
  const toast = useToast()
  const { me } = useAuth()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    title: '', description: '', dueDate: '', priority: 'normalna', dealId: '',
    owner: me?.name || me?.email || '',
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const save = async () => {
    if (!f.title.trim()) { toast('Vyplňte názov úlohy', 'err'); return }
    setSaving(true)
    try {
      await apiCall('addCrmTask', { task: { ...f, customerId, status: 'otvorena' } })
      toast('Úloha pridaná')
      onSaved()
    } catch (e) {
      toast(e.message, 'err')
      setSaving(false)
    }
  }

  return (
    <Modal title="Nová úloha / follow-up" onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
        <button className="btn" onClick={save} disabled={saving}>Uložiť</button>
      </>}>
      <div className="form-grid">
        <label className="field span-2"><span>Názov</span><input value={f.title} onChange={set('title')} /></label>
        <label className="field"><span>Termín</span><input type="date" value={f.dueDate} onChange={set('dueDate')} /></label>
        <label className="field"><span>Priorita</span>
          <select value={f.priority} onChange={set('priority')}>
            {CRM_TASK_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
        <label className="field span-2"><span>Dopyt (voliteľné)</span>
          <select value={f.dealId} onChange={set('dealId')}>
            <option value="">—</option>
            {deals.map(d => <option key={d.id} value={d.id}>{d.title || d.id}</option>)}
          </select>
        </label>
        <label className="field span-2"><span>Popis</span><textarea rows={2} value={f.description} onChange={set('description')} /></label>
      </div>
    </Modal>
  )
}

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

export default function CustomerDetail() {
  const { id } = useParams()
  const toast = useToast()
  const [state, setState] = useState({ loading: true, error: null })
  const [data, setData] = useState(null)
  const [editCustomer, setEditCustomer] = useState(false)
  const [modal, setModal] = useState(null)
  const [viewDealId, setViewDealId] = useState(null)

  const load = async () => {
    setState({ loading: true, error: null })
    try {
      setData(await apiCall('getCustomerDetail', { id }))
      setState({ loading: false, error: null })
    } catch (e) {
      setState({ loading: false, error: e })
    }
  }

  useEffect(() => { load() }, [id])

  const completeTask = async (taskId) => {
    try {
      const res = await apiCall('completeCrmTask', { id: taskId })
      toast('Úloha dokončená')
      load()
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

  const deleteContact = async (contactId) => {
    if (!window.confirm('Odstrániť kontakt?')) return
    try {
      await apiCall('deleteContact', { id: contactId })
      toast('Kontakt odstránený')
      load()
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  if (state.loading) return <Spinner />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  if (!data) return null

  const { customer, contacts, deals, activities, crmTasks, projects, invoices,
    turnover, turnoverLastYear, openDealsCount, openDealsValue,
    runningProjectsCount, runningProjectsValue, finishedProjectsCount } = data
  const name = customerDisplayName(customer)

  return (
    <>
      <div className="breadcrumb">
        <Link to="/zakaznici">Zákazníci</Link> / {name}
      </div>
      <header className="page-head">
        <div>
          <h1>{name}</h1>
          {customer.company && customer.firstName && (
            <p className="muted">{customer.company}</p>
          )}
        </div>
        <div className="head-actions">
          <button className="btn btn-secondary" onClick={() => setEditCustomer(true)}>Upraviť údaje</button>
          <button className="btn" onClick={() => setModal({ type: 'deal' })}>+ Dopyt</button>
        </div>
      </header>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Obrat tento rok</div>
          <div className="stat-value stat-value-sm">{fmtMoney(turnover)}</div>
          <div className="muted" style={{ fontSize: '0.85em' }}>Minulý rok: {fmtMoney(turnoverLastYear)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Otvorené dopyty</div>
          <div className="stat-value stat-value-sm">{openDealsCount}</div>
          {openDealsValue > 0 && <div className="muted" style={{ fontSize: '0.85em' }}>{fmtMoney(openDealsValue)}</div>}
        </div>
        <div className="stat-card">
          <div className="stat-label">Bežiace projekty</div>
          <div className="stat-value stat-value-sm">{runningProjectsCount}</div>
          {runningProjectsValue > 0 && <div className="muted" style={{ fontSize: '0.85em' }}>{fmtMoney(runningProjectsValue)}</div>}
          {finishedProjectsCount > 0 && <div className="muted" style={{ fontSize: '0.85em' }}>Ukončených: {finishedProjectsCount}</div>}
        </div>
        <div className="stat-card">
          <div className="stat-label">Posledný kontakt</div>
          <div className="stat-value stat-value-sm">{fmtDate(customer.lastContact)}</div>
        </div>
      </div>

      <div className="card">
        <h2>Údaje zákazníka</h2>
        <div className="detail-grid">
          <div><span className="muted">Typ</span><div>{customerTypeLabel(customer.customerType)}</div></div>
          <div><span className="muted">Stav</span><div>{customerStatusLabel(customer.customerStatus)}</div></div>
          <div><span className="muted">Telefón</span><div>{customer.phone || '—'}</div></div>
          <div><span className="muted">Email</span><div>{customer.email || '—'}</div></div>
          <div><span className="muted">Adresa</span><div>{[customer.address, customer.city].filter(Boolean).join(', ') || '—'}</div></div>
          <div><span className="muted">Obchodník</span><div>{customer.owner || '—'}</div></div>
          {(customer.billingName || customer.ico) && (
            <>
              <div className="span-2"><span className="muted">Fakturačný názov</span><div>{customer.billingName || '—'}</div></div>
              <div><span className="muted">Právna forma</span><div>{customer.legalForm || '—'}</div></div>
              <div><span className="muted">IČO</span><div>{customer.ico || '—'}</div></div>
              <div><span className="muted">DIČ</span><div>{customer.dic || '—'}</div></div>
              <div><span className="muted">IČ DPH</span><div>{customer.icDph || customer.vatId || '—'}</div></div>
              <div><span className="muted">Splatnosť</span><div>{customer.paymentTermsDays ? customer.paymentTermsDays + ' dní' : '—'}</div></div>
            </>
          )}
          {customer.driveFolderUrl && (
            <div className="span-2">
              <span className="muted">Drive</span>
              <div><a href={customer.driveFolderUrl} target="_blank" rel="noreferrer">Priečinok zákazníka</a></div>
            </div>
          )}
          {customer.notes && (
            <div className="span-2"><span className="muted">Poznámky</span><div className="prewrap">{customer.notes}</div></div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Kontaktné osoby</h2>
          <button className="btn btn-sm" onClick={() => setModal({ type: 'contact' })}>+ Kontakt</button>
        </div>
        {contacts.length === 0 ? <p className="muted">Žiadne kontakty.</p> : (
          <table className="table">
            <thead><tr><th>Meno</th><th>Typ</th><th>Rola</th><th>Telefón</th><th>Email</th><th>Preferovaný kontakt</th><th>Rozhoduje</th><th /></tr></thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c.id}>
                  <td className="strong">{c.name}</td>
                  <td>{contactTypeLabel(c.contactType)}</td>
                  <td>{c.role || '—'}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td>{c.preferredContact || '—'}</td>
                  <td>{c.decisionRole || '—'}</td>
                  <td className="row-action">
                    <button className="icon-btn" onClick={() => setModal({ type: 'contact', item: c })}>✎</button>{' '}
                    <button className="icon-btn" onClick={() => deleteContact(c.id)}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
            <thead><tr><th>Dátum</th><th>Typ</th><th>Téma</th><th>Výsledok</th><th>Ďalší krok</th></tr></thead>
            <tbody>
              {activities.map(a => (
                <tr key={a.id}>
                  <td>{fmtDate(a.date)}</td>
                  <td>{ACTIVITY_TYPES.find(t => t.value === a.type)?.label || a.type}</td>
                  <td>{a.subject || '—'}</td>
                  <td>{a.outcome || '—'}</td>
                  <td>{a.nextStep || '—'}</td>
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
                <tr key={t.id}>
                  <td>{fmtDate(t.dueDate)}</td>
                  <td>{t.title}</td>
                  <td>{ACTIVITY_TYPES.find(x => x.value === t.type)?.label || t.type || '—'}</td>
                  <td>{CRM_TASK_PRIORITIES.find(p => p.value === t.priority)?.label || t.priority || '—'}</td>
                  <td>{t.status === 'hotova' ? 'Hotová' : 'Otvorená'}</td>
                  <td>{t.description || '—'}</td>
                  <td>{t.dealId ? (deals.find(d => d.id === t.dealId)?.title || t.dealId) : '—'}</td>
                  <td className="row-action">
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
        <h2>Projekty (IS)</h2>
        {projects.length === 0 ? <p className="muted">Žiadne projekty.</p> : (
          <table className="table">
            <thead><tr><th>ID</th><th>Názov</th><th>Stav</th><th>Termín</th></tr></thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id}>
                  <td><Link to={'/projekty/' + p.id} className="project-id">{p.id}</Link></td>
                  <td>{p.name}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>{fmtDate(p.deadline)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Faktúry (IS)</h2>
        {invoices.length === 0 ? <p className="muted">Žiadne faktúry.</p> : (
          <table className="table">
            <thead><tr><th>Číslo</th><th>Projekt</th><th>Suma</th><th>Stav</th><th>Dátum</th></tr></thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td>{inv.number || inv.id}</td>
                  <td>{inv.project || '—'}</td>
                  <td className="num">{fmtMoney(inv.amountNet || inv.amount)}</td>
                  <td>{inv.status || '—'}</td>
                  <td>{fmtDate(inv.issueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editCustomer && (
        <CustomerForm
          customer={customer}
          onClose={() => setEditCustomer(false)}
          onSaved={() => { setEditCustomer(false); load() }}
        />
      )}

      {modal?.type === 'contact' && (
        <ContactModal
          customerId={id}
          contact={modal.item}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
      {modal?.type === 'activity' && (
        <ActivityModal
          customerId={id}
          deals={deals}
          contacts={contacts}
          initial={modal.initial}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
      {modal?.type === 'task' && (
        <CrmTaskModal
          customerId={id}
          deals={deals}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
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
