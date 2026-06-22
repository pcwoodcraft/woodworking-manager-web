import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Spinner, ErrorBox, StatusBadge } from '../../components/ui'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import { fmtDate, fmtMoney } from '../../utils/format'
import CustomerForm from './CustomerForm'
import {
  ACTIVITY_TYPES, CRM_TASK_PRIORITIES, DEAL_PHASES, DEAL_SOURCES,
  customerDisplayName, customerStatusLabel, customerTypeLabel,
  dealStatusLabel, phaseLabel, sourceLabel,
} from './crmConstants'

function ContactModal({ customerId, contact, onClose, onSaved }) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    name: contact?.name || '',
    role: contact?.role || '',
    phone: contact?.phone || '',
    email: contact?.email || '',
    contactType: contact?.contactType || 'hlavny',
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
        <label className="field span-2"><span>Rozhodovacia právomoc</span>
          <input value={f.decisionRole} onChange={set('decisionRole')} placeholder="rozhoduje / odporúča / vykonáva" />
        </label>
        <label className="field span-2"><span>Poznámky</span><textarea rows={2} value={f.notes} onChange={set('notes')} /></label>
      </div>
    </Modal>
  )
}

function ActivityModal({ customerId, deals, onClose, onSaved }) {
  const toast = useToast()
  const { me } = useAuth()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    type: 'hovor', subject: '', outcome: '', nextStep: '', dealId: '', contactName: '',
    owner: me?.name || me?.email || '', notes: '',
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const save = async () => {
    if (!f.type) { toast('Vyberte typ', 'err'); return }
    setSaving(true)
    try {
      await apiCall('addActivity', { activity: { ...f, customerId, date: new Date().toISOString().slice(0, 10) } })
      toast('Aktivita pridaná')
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
        <label className="field"><span>Kontaktná osoba</span><input value={f.contactName} onChange={set('contactName')} /></label>
        <label className="field"><span>Výsledok</span><input value={f.outcome} onChange={set('outcome')} /></label>
        <label className="field span-2"><span>Ďalší krok</span><input value={f.nextStep} onChange={set('nextStep')} /></label>
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
    owner: deal?.owner || '',
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
            <option value="vyhrate">Vyhraté</option>
            <option value="prehrate">Prehrané</option>
          </select>
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
      await apiCall('completeCrmTask', { id: taskId })
      toast('Úloha dokončená')
      load()
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

  const { customer, contacts, deals, activities, crmTasks, projects, invoices, turnover } = data
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
          <div className="stat-label">Obrat (uhradené faktúry)</div>
          <div className="stat-value stat-value-sm">{fmtMoney(turnover)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Otvorené dopyty</div>
          <div className="stat-value stat-value-sm">{deals.filter(d => d.status === 'otvoreny').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Projekty</div>
          <div className="stat-value stat-value-sm">{projects.length}</div>
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
            <thead><tr><th>Meno</th><th>Rola</th><th>Telefón</th><th>Email</th><th /></tr></thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c.id}>
                  <td className="strong">{c.name}</td>
                  <td>{c.role || '—'}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.email || '—'}</td>
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
                <tr key={d.id}>
                  <td className="project-id">{d.id}</td>
                  <td className="strong">{d.title}</td>
                  <td>{phaseLabel(d.phase)}</td>
                  <td>{dealStatusLabel(d.status)}</td>
                  <td>{sourceLabel(d.source)}</td>
                  <td className="num">{d.estimatedValue ? fmtMoney(d.estimatedValue) : '—'}</td>
                  <td className="row-action">
                    <button className="icon-btn" onClick={() => setModal({ type: 'deal', item: d })}>✎</button>
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
            <thead><tr><th>Termín</th><th>Názov</th><th>Priorita</th><th>Stav</th><th /></tr></thead>
            <tbody>
              {crmTasks.map(t => (
                <tr key={t.id}>
                  <td>{fmtDate(t.dueDate)}</td>
                  <td>{t.title}</td>
                  <td>{CRM_TASK_PRIORITIES.find(p => p.value === t.priority)?.label || t.priority || '—'}</td>
                  <td>{t.status === 'hotova' ? 'Hotová' : 'Otvorená'}</td>
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
      {modal?.type === 'deal' && (
        <DealModal
          customerId={id}
          deal={modal.item}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </>
  )
}
