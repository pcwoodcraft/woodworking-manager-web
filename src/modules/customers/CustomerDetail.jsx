import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Spinner, ErrorBox, StatusBadge } from '../../components/ui'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import { fmtDate, fmtMoney } from '../../utils/format'
import CustomerForm from './CustomerForm'
import {
  customerDisplayName, customerStatusLabel, customerTypeLabel, contactTypeLabel,
} from './customerConstants'

// Dopyty, aktivity, úlohy a reklamácie patria modulu CRM — jadro ich načíta lenivo a len keď
// je modul aktívny (fáza 2b, Úloha C2). Kartotéka zákazníka funguje aj bez CRM.
const CustomerCrmSections = lazy(() => import('../crm/CustomerCrmSections'))

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

export default function CustomerDetail() {
  const { id } = useParams()
  const toast = useToast()
  const { can, hasModule } = useAuth()
  const isAdmin = can('perm_admin')
  // Rovnaké právo, aké vyžaduje akcia na serveri (`perm/permMap.ts:257`).
  const canCustomers = can('perm_customers')
  const [state, setState] = useState({ loading: true, error: null })
  const [data, setData] = useState(null)
  const [editCustomer, setEditCustomer] = useState(false)
  // Jadrový `modal` rieši už len kontaktné osoby — dopyt/aktivita/úloha/reklamácia majú
  // vlastný stav vnútri `CustomerCrmSections`.
  const [modal, setModal] = useState(null)
  const [creatingFolder, setCreatingFolder] = useState(false)

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

  // Zákazník, ktorý priečinok nikdy nedostal, ho cez UI nemal ako získať — akciu nevolalo
  // nič vo webe (zistené pri cutovere fázy 3a, 12. 8. 2026). Vzor je `ProjectFilesTab`.
  const createFolder = async () => {
    setCreatingFolder(true)
    try {
      const res = await apiCall('ensureCustomerFolder', { customerId: id })
      toast(res.created ? 'Priečinok vytvorený na Drive' : 'Priečinok už existuje')
      await load()
    } catch (e) {
      toast('Nepodarilo sa vytvoriť priečinok: ' + e.message, 'err')
    } finally {
      setCreatingFolder(false)
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

  const { customer, contacts, deals, activities, crmTasks, projects, invoices, complaints = [],
    turnover, turnoverLastYear, openDealsCount, openDealsValue,
    runningProjectsCount, runningProjectsValue, finishedProjectsCount, isOrphan } = data
  const name = customerDisplayName(customer)

  return (
    <>
      <div className="breadcrumb">
        <Link to="/zakaznici">Zákazníci</Link> / {name}
      </div>
      <header className="page-head">
        <div>
          <h1>{name}</h1>
          {isAdmin && isOrphan && (
            <span className="kanban-stale-badge" style={{ marginTop: 6, display: 'inline-block' }}>
              Osirelý — chýba obchodník
            </span>
          )}
          {customer.company && customer.firstName && (
            <p className="muted">{customer.company}</p>
          )}
        </div>
        <div className="head-actions">
          <button className="btn btn-secondary" onClick={() => setEditCustomer(true)}>Upraviť údaje</button>
        </div>
      </header>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Obrat tento rok</div>
          <div className="stat-value stat-value-sm">{fmtMoney(turnover)}</div>
          <div className="muted" style={{ fontSize: '0.85em' }}>Minulý rok: {fmtMoney(turnoverLastYear)}</div>
          <div className="muted" style={{ fontSize: '0.78em', marginTop: 4 }}>Súčet prijatých úhrad podľa dátumu platby (bez DPH)</div>
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
          {(customer.driveFolderUrl || canCustomers) && (
            <div className="span-2">
              <span className="muted">Drive</span>
              {customer.driveFolderUrl ? (
                <div><a href={customer.driveFolderUrl} target="_blank" rel="noreferrer">Priečinok zákazníka</a></div>
              ) : (
                <div>
                  <button className="btn btn-sm" onClick={createFolder} disabled={creatingFolder}>
                    {creatingFolder ? 'Vytvára sa…' : 'Vytvoriť priečinok na Drive'}
                  </button>
                  <div className="muted" style={{ fontSize: '0.85em', marginTop: 4 }}>
                    Zákazník ešte nemá priečinok na zdieľanom disku.
                  </div>
                </div>
              )}
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

      {hasModule('crm') && (
        <Suspense fallback={<Spinner label="Načítavam…" />}>
          <CustomerCrmSections
            customerId={id} deals={deals} activities={activities} crmTasks={crmTasks}
            complaints={complaints} contacts={contacts} projects={projects} onReload={load}
          />
        </Suspense>
      )}

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
    </>
  )
}
