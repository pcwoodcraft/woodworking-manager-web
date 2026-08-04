import { useState } from 'react'
import { apiCall } from '../../api/client'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import { toIsoDate } from '../../utils/format'
import { COMPLAINT_RESPONSIBILITIES, COMPLAINT_STATUSES } from './crmConstants'

export default function ComplaintModal({ customerId, projects = [], complaint, onClose, onSaved }) {
  const toast = useToast()
  const isEdit = !!complaint?.id
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    date: toIsoDate(complaint?.date) || new Date().toISOString().slice(0, 10),
    projectId: complaint?.projectId || '',
    description: complaint?.description || '',
    responsibility: complaint?.responsibility || 'ine',
    status: complaint?.status || 'nova',
    cost: complaint?.cost ?? '',
    outcome: complaint?.outcome || '',
    lesson: complaint?.lesson || '',
    link: complaint?.link || '',
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const save = async () => {
    if (!f.description.trim()) {
      toast('Vyplňte popis reklamácie', 'err')
      return
    }
    setSaving(true)
    try {
      const payload = {
        complaint: {
          ...f,
          customerId,
          id: complaint?.id,
        },
      }
      await apiCall(isEdit ? 'updateComplaint' : 'addComplaint', payload)
      toast(isEdit ? 'Reklamácia uložená' : 'Reklamácia pridaná')
      onSaved()
    } catch (e) {
      toast(e.message, 'err')
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Upraviť reklamáciu' : 'Nová reklamácia'} onClose={onClose} wide
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
        <button className="btn" onClick={save} disabled={saving}>Uložiť</button>
      </>}>
      <div className="form-grid">
        <label className="field"><span>Dátum</span>
          <input type="date" value={f.date} onChange={set('date')} />
        </label>
        <label className="field"><span>Projekt</span>
          <select value={f.projectId} onChange={set('projectId')}>
            <option value="">— bez projektu —</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.id} — {p.name}</option>
            ))}
          </select>
        </label>
        <label className="field span-2"><span>Popis problému</span>
          <textarea rows={3} value={f.description} onChange={set('description')} />
        </label>
        <label className="field"><span>Zodpovednosť</span>
          <select value={f.responsibility} onChange={set('responsibility')}>
            {COMPLAINT_RESPONSIBILITIES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </label>
        <label className="field"><span>Stav</span>
          <select value={f.status} onChange={set('status')}>
            {COMPLAINT_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="field"><span>Náklady (€)</span>
          <input type="number" min="0" step="0.01" value={f.cost} onChange={set('cost')} />
        </label>
        <label className="field span-2"><span>Výsledok</span>
          <input value={f.outcome} onChange={set('outcome')} />
        </label>
        <label className="field span-2"><span>Poučenie</span>
          <textarea rows={2} value={f.lesson} onChange={set('lesson')} />
        </label>
        <label className="field span-2"><span>Odkaz (URL)</span>
          <input value={f.link} onChange={set('link')} placeholder="https://..." />
        </label>
      </div>
    </Modal>
  )
}
