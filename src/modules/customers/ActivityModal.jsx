import { useState } from 'react'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import { toIsoDate } from '../../utils/format'
import { ACTIVITY_TYPES, CRM_TASK_PRIORITIES } from './crmConstants'

export default function ActivityModal({ customerId, deals = [], contacts = [], activity, initial, onClose, onSaved }) {
  const toast = useToast()
  const { me } = useAuth()
  const isEdit = !!activity?.id
  const seed = activity || initial || {}
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    type: seed.type || 'hovor',
    subject: seed.subject || '',
    outcome: seed.outcome || '',
    nextStep: seed.nextStep || '',
    followUpDate: seed.followUpDate || '',
    followUpPriority: seed.followUpPriority || 'normalna',
    dealId: seed.dealId || '',
    contactId: seed.contactId || '',
    contactName: seed.contactName || '',
    ownerEmail: seed.ownerEmail || me?.email || '',
    notes: seed.notes || '',
    date: toIsoDate(seed.date) || new Date().toISOString().slice(0, 10),
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
      if (isEdit) {
        await apiCall('updateActivity', {
          activity: { ...f, id: activity.id, customerId },
        })
        toast('Aktivita uložená')
      } else {
        await apiCall('addActivity', {
          activity: { ...f, customerId, date: f.date },
          followUpDate: f.followUpDate || undefined,
          followUpPriority: f.followUpPriority,
        })
        toast(f.followUpDate && f.nextStep.trim() ? 'Aktivita a follow-up úloha pridané' : 'Aktivita pridaná')
      }
      onSaved()
    } catch (e) {
      toast(e.message, 'err')
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Upraviť aktivitu' : 'Nová aktivita'} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
        <button className="btn" onClick={save} disabled={saving}>Uložiť</button>
      </>}>
      <div className="form-grid">
        <label className="field"><span>Dátum</span>
          <input type="date" value={f.date} onChange={set('date')} />
        </label>
        <label className="field"><span>Typ</span>
          <select value={f.type} onChange={set('type')}>
            {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <label className="field span-2"><span>Dopyt (voliteľné)</span>
          <select value={f.dealId} onChange={set('dealId')}>
            <option value="">—</option>
            {deals.map(d => <option key={d.id} value={d.id}>{d.title || d.id}</option>)}
          </select>
        </label>
        <label className="field span-2"><span>Téma</span><input value={f.subject} onChange={set('subject')} /></label>
        <label className="field"><span>Kontaktná osoba</span>
          {contacts.length > 0 ? (
            <select value={f.contactId} onChange={e => onContactChange(e.target.value)}>
              <option value="">—</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : (
            <input value={f.contactName} onChange={set('contactName')} />
          )}
        </label>
        <label className="field"><span>Výsledok</span><input value={f.outcome} onChange={set('outcome')} /></label>
        {!isEdit && (
          <>
            <label className="field span-2"><span>Ďalší krok</span><input value={f.nextStep} onChange={set('nextStep')} /></label>
            <label className="field"><span>Termín follow-up</span>
              <input type="date" value={f.followUpDate} onChange={set('followUpDate')} />
            </label>
            <label className="field"><span>Priorita úlohy</span>
              <select value={f.followUpPriority} onChange={set('followUpPriority')}>
                {CRM_TASK_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </label>
          </>
        )}
        {isEdit && (
          <label className="field span-2"><span>Ďalší krok</span><input value={f.nextStep} onChange={set('nextStep')} /></label>
        )}
        <label className="field span-2"><span>Poznámky</span><textarea rows={2} value={f.notes} onChange={set('notes')} /></label>
      </div>
    </Modal>
  )
}
