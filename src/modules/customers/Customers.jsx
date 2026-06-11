import { useEffect, useState } from 'react'
import { apiCall } from '../../api/client'
import { Spinner, ErrorBox } from '../../components/ui'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import { fmtDate, toIsoDate } from '../../utils/format'

function CustomerForm({ customer, onClose, onSaved }) {
  const toast = useToast()
  const isEdit = !!customer
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    firstName: customer?.firstName || '',
    lastName: customer?.lastName || '',
    company: customer?.company || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: customer?.address || '',
    lastContact: toIsoDate(customer?.lastContact) || '',
    notes: customer?.notes || '',
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const save = async () => {
    if (!f.firstName.trim() && !f.lastName.trim() && !f.company.trim()) {
      toast('Vyplňte meno alebo firmu', 'err'); return
    }
    setSaving(true)
    try {
      await apiCall(isEdit ? 'updateCustomer' : 'addCustomer', {
        customer: { id: customer?.id || 'C' + Date.now(), ...f },
      })
      toast(isEdit ? 'Zákazník uložený' : 'Zákazník pridaný')
      onSaved()
    } catch (e) {
      toast('Nepodarilo sa uložiť: ' + e.message, 'err')
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Upraviť zákazníka' : 'Nový zákazník'} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Ukladá sa…' : 'Uložiť'}</button>
      </>}>
      <div className="form-grid">
        <label className="field"><span>Meno</span><input value={f.firstName} onChange={set('firstName')} /></label>
        <label className="field"><span>Priezvisko</span><input value={f.lastName} onChange={set('lastName')} /></label>
        <label className="field span-2"><span>Firma</span><input value={f.company} onChange={set('company')} /></label>
        <label className="field"><span>Telefón</span><input value={f.phone} onChange={set('phone')} /></label>
        <label className="field"><span>Email</span><input type="email" value={f.email} onChange={set('email')} /></label>
        <label className="field"><span>Adresa</span><input value={f.address} onChange={set('address')} /></label>
        <label className="field"><span>Posledný kontakt</span><input type="date" value={f.lastContact} onChange={set('lastContact')} /></label>
        <label className="field span-2"><span>Poznámky</span><textarea rows={3} value={f.notes} onChange={set('notes')} /></label>
      </div>
    </Modal>
  )
}

export default function Customers() {
  const toast = useToast()
  const [state, setState] = useState({ loading: true, error: null })
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(null) // null | 'new' | zákazník

  const load = async () => {
    setState({ loading: true, error: null })
    try {
      setCustomers(await apiCall('getCustomers'))
      setState({ loading: false, error: null })
    } catch (e) {
      setState({ loading: false, error: e })
    }
  }

  useEffect(() => { load() }, [])

  const remove = async (c) => {
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.company
    if (!window.confirm('Naozaj odstrániť zákazníka „' + name + '“?')) return
    try {
      await apiCall('deleteCustomer', { id: c.id })
      toast('Zákazník odstránený')
      load()
    } catch (e) {
      toast('Nepodarilo sa odstrániť: ' + e.message, 'err')
    }
  }

  if (state.loading) return <Spinner />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  const q = search.trim().toLowerCase()
  const visible = customers.filter(c =>
    !q || [c.firstName, c.lastName, c.company, c.phone, c.email, c.address]
      .some(v => (v || '').toLowerCase().includes(q))
  )

  return (
    <div className="page">
      <header className="page-head">
        <h1>Zákazníci</h1>
        <button className="btn" onClick={() => setForm('new')}>+ Nový zákazník</button>
      </header>

      <div className="filter-bar">
        <input className="filter-search" placeholder="Hľadať meno, firmu, telefón…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card">
        {visible.length === 0 ? <p className="muted">Žiadni zákazníci.</p> : (
          <table className="table">
            <thead>
              <tr><th>Meno</th><th>Firma</th><th>Telefón</th><th>Adresa</th><th>Posledný kontakt</th><th /></tr>
            </thead>
            <tbody>
              {visible.map(c => (
                <tr key={c.id}>
                  <td className="strong">{[c.firstName, c.lastName].filter(Boolean).join(' ')}</td>
                  <td>{c.company}</td>
                  <td>{c.phone}</td>
                  <td>{c.address}</td>
                  <td>{fmtDate(c.lastContact)}</td>
                  <td className="row-action">
                    <button className="icon-btn" title="Upraviť" onClick={() => setForm(c)}>✎</button>{' '}
                    <button className="icon-btn" title="Odstrániť" onClick={() => remove(c)}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {form && (
        <CustomerForm
          customer={form === 'new' ? null : form}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); load() }}
        />
      )}
    </div>
  )
}
