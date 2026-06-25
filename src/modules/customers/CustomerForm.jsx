import { useEffect, useState } from 'react'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import { toIsoDate } from '../../utils/format'
import { CUSTOMER_TYPES, CUSTOMER_STATUSES } from './crmConstants'
import SalesOwnerSelect from './SalesOwnerSelect'

export default function CustomerForm({ customer, onClose, onSaved }) {
  const toast = useToast()
  const { me } = useAuth()
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
    ownerEmail: customer?.ownerEmail || me?.email || '',
    isPartner: customer?.isPartner || '',
    potential: customer?.potential || '',
    risk: customer?.risk || '',
    lastContact: toIsoDate(customer?.lastContact) || '',
    notes: customer?.notes || '',
    billingName: customer?.billingName || '',
    legalForm: customer?.legalForm || '',
    ico: customer?.ico || '',
    dic: customer?.dic || '',
    icDph: customer?.icDph || '',
    isVatPayer: customer?.isVatPayer === 'true' || customer?.isVatPayer === true,
    billingEmail: customer?.billingEmail || '',
    paymentTermsDays: customer?.paymentTermsDays || '',
    fileLabel: customer?.fileLabel || '',
    internalNotes: customer?.internalNotes || '',
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  useEffect(() => {
    if (!isEdit && me?.email && !f.ownerEmail) {
      setF(prev => ({ ...prev, ownerEmail: me.email }))
    }
  }, [me, isEdit, f.ownerEmail])

  const save = async () => {
    if (!f.firstName.trim() && !f.lastName.trim() && !f.company.trim()) {
      toast('Vyplňte meno alebo firmu', 'err'); return
    }
    setSaving(true)
    try {
      const payload = {
        ...(isEdit ? { id: customer.id } : {}),
        ...f,
        isVatPayer: f.isVatPayer ? 'true' : 'false',
      }
      await apiCall(isEdit ? 'updateCustomer' : 'addCustomer', { customer: payload })
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
        <label className="field"><span>Telefón</span><input value={f.phone} onChange={set('phone')} /></label>
        <label className="field"><span>Email</span><input type="email" value={f.email} onChange={set('email')} /></label>
        <label className="field"><span>Mesto</span><input value={f.city} onChange={set('city')} /></label>
        <label className="field"><span>Adresa</span><input value={f.address} onChange={set('address')} /></label>
        <label className="field"><span>Web</span><input value={f.website} onChange={set('website')} /></label>
        <label className="field"><span>Jazyk</span><input value={f.language} onChange={set('language')} placeholder="SK / DE" /></label>
        <label className="field"><span>Rating</span><input value={f.rating} onChange={set('rating')} placeholder="A–D" /></label>
        <label className="field"><span>Príznak</span><input value={f.flag} onChange={set('flag')} placeholder="VIP / Rizikový" /></label>
        <label className="field"><span>Obchodník</span>
          <SalesOwnerSelect value={f.ownerEmail} onChange={v => setF({ ...f, ownerEmail: v })} />
        </label>
        <label className="field"><span>Posledný kontakt</span><input type="date" value={f.lastContact} onChange={set('lastContact')} /></label>
        <label className="field span-2"><span>Poznámky (CRM)</span><textarea rows={2} value={f.notes} onChange={set('notes')} /></label>
      </div>

      <h3 style={{ marginTop: 20, marginBottom: 8 }}>Fakturačné údaje</h3>
      <div className="form-grid">
        <label className="field span-2"><span>Fakturačný názov</span>
          <input value={f.billingName} onChange={set('billingName')} placeholder="Ak sa líši od mena / firmy" />
        </label>
        <label className="field span-2"><span>Štítok do názvu PDF ponuky</span>
          <input value={f.fileLabel} onChange={set('fileLabel')} placeholder="napr. Buryova — ak prázdne, odvodí sa z mena" />
        </label>
        <label className="field"><span>Právna forma</span>
          <input value={f.legalForm} onChange={set('legalForm')} placeholder="napr. s.r.o., živnosť" />
        </label>
        <label className="field"><span>IČO</span><input value={f.ico} onChange={set('ico')} /></label>
        <label className="field"><span>DIČ</span><input value={f.dic} onChange={set('dic')} /></label>
        <label className="field"><span>IČ DPH</span><input value={f.icDph} onChange={set('icDph')} /></label>
        <label className="field"><span>IČ DPH / VAT ID (zahraničné)</span><input value={f.vatId} onChange={set('vatId')} placeholder="napr. DE123456789" /></label>
        <label className="field"><span>Krajina</span><input value={f.country} onChange={set('country')} placeholder="napr. SK / DE" /></label>
        <label className="field"><span>Fakturačný email</span><input type="email" value={f.billingEmail} onChange={set('billingEmail')} /></label>
        <label className="field"><span>Splatnosť (dní)</span>
          <input type="number" min="1" value={f.paymentTermsDays} onChange={set('paymentTermsDays')} placeholder="napr. 14" />
        </label>
        <label className="field switch-row">
          <input type="checkbox" checked={f.isVatPayer} onChange={set('isVatPayer')} />
          <span>Platca DPH</span>
        </label>
        <label className="field span-2"><span>Interné poznámky</span>
          <textarea rows={2} value={f.internalNotes} onChange={set('internalNotes')} />
        </label>
      </div>
    </Modal>
  )
}
