import { useState } from 'react'
import { apiCall } from '../../api/client'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import { toIsoDate } from '../../utils/format'
import { ACTIVITY_TYPES, CRM_TASK_PRIORITIES } from './crmConstants'

export default function CrmTaskModal({ customerId, deals = [], task, onClose, onSaved }) {
  const toast = useToast()
  const isEdit = !!task?.id
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    title: task?.title || '',
    description: task?.description || '',
    dueDate: toIsoDate(task?.dueDate) || '',
    priority: task?.priority || 'normalna',
    type: task?.type || 'followup',
    dealId: task?.dealId || '',
    status: task?.status || 'otvorena',
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const save = async () => {
    if (!f.title.trim()) { toast('Vyplňte názov úlohy', 'err'); return }
    setSaving(true)
    try {
      if (isEdit) {
        await apiCall('updateCrmTask', { task: { ...f, id: task.id, customerId } })
        toast('Úloha uložená')
      } else {
        await apiCall('addCrmTask', { task: { ...f, customerId, status: 'otvorena' } })
        toast('Úloha pridaná')
      }
      onSaved()
    } catch (e) {
      toast(e.message, 'err')
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Upraviť úlohu' : 'Nová úloha / follow-up'} onClose={onClose}
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
        <label className="field"><span>Typ</span>
          <select value={f.type} onChange={set('type')}>
            {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            <option value="followup">Follow-up</option>
          </select>
        </label>
        {isEdit && (
          <label className="field"><span>Stav</span>
            <select value={f.status} onChange={set('status')}>
              <option value="otvorena">Otvorená</option>
              <option value="hotova">Hotová</option>
            </select>
          </label>
        )}
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
