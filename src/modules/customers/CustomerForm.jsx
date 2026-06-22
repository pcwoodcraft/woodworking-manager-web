import { useState } from 'react'
import { apiCall } from '../../api/client'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import { toIsoDate } from '../../utils/format'
import { CUSTOMER_TYPES, CUSTOMER_STATUSES } from './crmConstants'

export default function CustomerForm({ customer, onClose, onSaved }) {
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
    city: customer?.city || '',
    vatId: customer?.vatId || '',
    country: customer?.country || '',
    website: customer?.website || '',
    language: customer?.language || '',
    customerType: customer?.customerType || '',
    customerStatus: customer?.customerStatus || '',
    rating: customer?.rating || '',
    flag: customer?.flag || '',
    owner: customer?.owner || '',
    isPartner: customer?.isPartner || '',
    potential: customer?.potential || '',
    risk: customer?.risk || '',
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
    <Modal title={isEdit ? 'Upraviť zákazníka' : 'Nový zákazník'} onClose={onClose} wide
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Ukladá sa…' : 'Uložiť'}</button>
      </>}>
      <div className="form-grid">
        <label className="field"><span>Meno</span><input value={f.firstName} onChange={set('firstName')} /></label>
        <label className="field"><span>Priezvisko</span><input value={f.lastName} onChange={set('lastName')} /></label>
        <label className="field span-2"><span>Firma</span><input value={f.company} onChange={set('company')} /></label>
        <label className="field"><span>Typ zákazníka</span>
          <select value={f.customerType} onChange={set('customerType')}>
            <option value="">—</option>
            {CUSTOMER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <label className="field"><span>Stav</span>
          <select value={f.customerStatus} onChange={set('customerStatus')}>
            <option value="">—</option>
            {CUSTOMER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label className="field"><span>IČ DPH / VAT ID</span><input value={f.vatId} onChange={set('vatId')} placeholder="napr. DE123456789" /></label>
        <label className="field"><span>Krajina</span><input value={f.country} onChange={set('country')} placeholder="napr. Nemecko / DE" /></label>
        <label className="field"><span>Telefón</span><input value={f.phone} onChange={set('phone')} /></label>
        <label className="field"><span>Email</span><input type="email" value={f.email} onChange={set('email')} /></label>
        <label className="field"><span>Mesto</span><input value={f.city} onChange={set('city')} /></label>
        <label className="field"><span>Adresa</span><input value={f.address} onChange={set('address')} /></label>
        <label className="field"><span>Web</span><input value={f.website} onChange={set('website')} /></label>
        <label className="field"><span>Jazyk</span><input value={f.language} onChange={set('language')} placeholder="SK / DE" /></label>
        <label className="field"><span>Rating</span><input value={f.rating} onChange={set('rating')} placeholder="A–D" /></label>
        <label className="field"><span>Príznak</span><input value={f.flag} onChange={set('flag')} placeholder="VIP / Rizikový" /></label>
        <label className="field"><span>Vlastník (obchodník)</span><input value={f.owner} onChange={set('owner')} /></label>
        <label className="field"><span>Posledný kontakt</span><input type="date" value={f.lastContact} onChange={set('lastContact')} /></label>
        <label className="field span-2"><span>Poznámky</span><textarea rows={3} value={f.notes} onChange={set('notes')} /></label>
      </div>
    </Modal>
  )
}
