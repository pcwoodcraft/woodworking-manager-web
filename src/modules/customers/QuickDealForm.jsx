import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Spinner, ErrorBox } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { DEAL_SOURCES, PRODUCT_TYPES, customerDisplayName } from './crmConstants'
import SalesOwnerSelect from './SalesOwnerSelect'

export default function QuickDealForm() {
  const toast = useToast()
  const navigate = useNavigate()
  const { me } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [customers, setCustomers] = useState([])
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState('existing')
  const [customerId, setCustomerId] = useState('')
  const [customer, setCustomer] = useState({
    firstName: '', lastName: '', company: '', phone: '', email: '', customerType: 'sukromna',
  })
  const [contact, setContact] = useState({ name: '', phone: '', email: '', role: '' })
  const [deal, setDeal] = useState({
    title: '', productType: '', source: 'telefon', estimatedValue: '', notes: '', ownerEmail: me?.email || '',
  })

  useEffect(() => {
    apiCall('getCustomers')
      .then(setCustomers)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (me?.email && !deal.ownerEmail) setDeal(d => ({ ...d, ownerEmail: me.email }))
  }, [me, deal.ownerEmail])

  const save = async () => {
    if (mode === 'existing' && !customerId) {
      toast('Vyberte zákazníka', 'err'); return
    }
    if (mode === 'new' && !customer.firstName.trim() && !customer.lastName.trim() && !customer.company.trim()) {
      toast('Vyplňte meno alebo firmu', 'err'); return
    }
    if (!deal.source) {
      toast('Vyberte zdroj dopytu', 'err'); return
    }
    setSaving(true)
    try {
      const payload = {
        deal: {
          title: deal.title,
          productType: deal.productType,
          source: deal.source,
          estimatedValue: deal.estimatedValue,
          notes: deal.notes,
          ownerEmail: deal.ownerEmail,
          phase: 'novy_dopyt',
          status: 'otvoreny',
        },
      }
      if (mode === 'existing') {
        payload.customerId = customerId
      } else {
        payload.customer = { ...customer, ownerEmail: deal.ownerEmail, customerStatus: 'novy' }
      }
      if (contact.name.trim()) payload.contact = contact
      const res = await apiCall('addQuickDeal', payload)
      toast('Dopyt vytvorený')
      navigate('/zakaznici/' + res.customerId)
    } catch (e) {
      toast('Nepodarilo sa uložiť: ' + e.message, 'err')
      setSaving(false)
    }
  }

  if (loading) return <Spinner />
  if (error) return <ErrorBox error={error} />

  return (
    <>
      <div className="card">
        <h2>Rýchly nový dopyt</h2>
        <p className="muted" style={{ marginBottom: 16 }}>
          Zákazník + obchodný prípad v jednom kroku.
        </p>

        <div className="form-grid">
          <label className="field span-2">
            <span>Existujúci alebo nový zákazník</span>
            <select value={mode} onChange={e => setMode(e.target.value)}>
              <option value="existing">Existujúci zákazník</option>
              <option value="new">Nový zákazník</option>
            </select>
          </label>

          {mode === 'existing' ? (
            <label className="field span-2">
              <span>Zákazník</span>
              <select value={customerId} onChange={e => setCustomerId(e.target.value)}>
                <option value="">— vyberte —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{customerDisplayName(c)}</option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label className="field"><span>Meno</span>
                <input value={customer.firstName} onChange={e => setCustomer({ ...customer, firstName: e.target.value })} />
              </label>
              <label className="field"><span>Priezvisko</span>
                <input value={customer.lastName} onChange={e => setCustomer({ ...customer, lastName: e.target.value })} />
              </label>
              <label className="field span-2"><span>Firma</span>
                <input value={customer.company} onChange={e => setCustomer({ ...customer, company: e.target.value })} />
              </label>
              <label className="field"><span>Telefón</span>
                <input value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} />
              </label>
              <label className="field"><span>Email</span>
                <input type="email" value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} />
              </label>
            </>
          )}

          <label className="field span-2"><span>Názov dopytu</span>
            <input value={deal.title} onChange={e => setDeal({ ...deal, title: e.target.value })}
              placeholder="napr. Schodisko dub — RD Žilina" />
          </label>
          <label className="field"><span>Typ produktu</span>
            <select value={deal.productType} onChange={e => setDeal({ ...deal, productType: e.target.value })}>
              <option value="">—</option>
              {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="field"><span>Zdroj dopytu</span>
            <select value={deal.source} onChange={e => setDeal({ ...deal, source: e.target.value })}>
              {DEAL_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <label className="field"><span>Odhadovaná hodnota (€)</span>
            <input type="number" value={deal.estimatedValue} onChange={e => setDeal({ ...deal, estimatedValue: e.target.value })} />
          </label>
          <label className="field"><span>Obchodník</span>
            <SalesOwnerSelect value={deal.ownerEmail} onChange={v => setDeal({ ...deal, ownerEmail: v })} />
          </label>
          <label className="field span-2"><span>Poznámka</span>
            <textarea rows={2} value={deal.notes} onChange={e => setDeal({ ...deal, notes: e.target.value })} />
          </label>

          <div className="span-2" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <strong>Kontaktná osoba</strong> <span className="muted">(voliteľné)</span>
          </div>
          <label className="field"><span>Meno</span>
            <input value={contact.name} onChange={e => setContact({ ...contact, name: e.target.value })} />
          </label>
          <label className="field"><span>Rola</span>
            <input value={contact.role} onChange={e => setContact({ ...contact, role: e.target.value })} />
          </label>
          <label className="field"><span>Telefón</span>
            <input value={contact.phone} onChange={e => setContact({ ...contact, phone: e.target.value })} />
          </label>
          <label className="field"><span>Email</span>
            <input type="email" value={contact.email} onChange={e => setContact({ ...contact, email: e.target.value })} />
          </label>
        </div>
      </div>

      <div className="head-actions">
        <Link to="/zakaznici" className="btn btn-secondary">Späť</Link>
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Ukladá sa…' : 'Vytvoriť dopyt'}</button>
      </div>
    </>
  )
}
