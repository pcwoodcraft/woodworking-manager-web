import { useState } from 'react'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { apiCall } from '../../api/client'
import { PROJECT_STATUSES, normalizeStatus, toIsoDate, parseNum } from '../../utils/format'

// Pridanie / úprava projektu. customers môže byť prázdne (bez perm_customers) —
// vtedy sa zákazník nemení a pole je len na čítanie.
export default function ProjectForm({ project, customers, onClose, onSaved }) {
  const toast = useToast()
  const isEdit = !!project
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    name: project?.name || '',
    customerId: project?.customerId || '',
    price: project?.price || '',
    estimatedMaterialCosts: project?.estimatedMaterialCosts || '',
    estimatedHours: project?.estimatedHours || '',
    hourlyRate: project?.hourlyRate || '25',
    status: project ? normalizeStatus(project.status) : 'priprava',
    deadline: toIsoDate(project?.deadline) || '',
    notes: project?.notes || '',
  })

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const save = async () => {
    if (!f.name.trim()) { toast('Vyplňte názov projektu', 'err'); return }
    const cust = customers.find(c => c.id === f.customerId)
    const customerName = cust
      ? [cust.firstName, cust.lastName].filter(Boolean).join(' ')
      : (project?.customer || '')
    const data = {
      id: project?.id || 'P' + Date.now(),
      name: f.name.trim(),
      customerId: f.customerId,
      customer: customerName,
      price: parseNum(f.price),
      estimatedMaterialCosts: f.estimatedMaterialCosts === '' ? '' : parseNum(f.estimatedMaterialCosts),
      estimatedHours: f.estimatedHours === '' ? '' : parseNum(f.estimatedHours),
      hourlyRate: parseNum(f.hourlyRate),
      status: f.status,
      deadline: f.deadline,
      notes: f.notes,
    }
    setSaving(true)
    try {
      await apiCall(isEdit ? 'updateProject' : 'addProject', { project: data })
      toast(isEdit ? 'Projekt uložený' : 'Projekt pridaný')
      onSaved()
    } catch (e) {
      toast('Nepodarilo sa uložiť: ' + e.message, 'err')
      setSaving(false)
    }
  }

  return (
    <Modal
      title={isEdit ? 'Upraviť projekt' : 'Nový projekt'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
          <button className="btn" onClick={save} disabled={saving}>{saving ? 'Ukladá sa…' : 'Uložiť'}</button>
        </>
      }
    >
      <div className="form-grid">
        <label className="field span-2">
          <span>Názov projektu *</span>
          <input value={f.name} onChange={set('name')} placeholder="napr. Schody Bystričany" />
        </label>
        <label className="field span-2">
          <span>Zákazník</span>
          {customers.length > 0 ? (
            <select value={f.customerId} onChange={set('customerId')}>
              <option value="">— Vyberte zákazníka —</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {[c.firstName, c.lastName].filter(Boolean).join(' ')}{c.company ? ` (${c.company})` : ''}
                </option>
              ))}
            </select>
          ) : (
            <input value={project?.customer || ''} disabled />
          )}
        </label>
        <label className="field">
          <span>Cena (€)</span>
          <input type="number" value={f.price} onChange={set('price')} />
        </label>
        <label className="field">
          <span>Termín</span>
          <input type="date" value={f.deadline} onChange={set('deadline')} />
        </label>
        <label className="field">
          <span>Odhad materiálu (€)</span>
          <input type="number" value={f.estimatedMaterialCosts} onChange={set('estimatedMaterialCosts')} />
        </label>
        <label className="field">
          <span>Odhad hodín</span>
          <input type="number" value={f.estimatedHours} onChange={set('estimatedHours')} />
        </label>
        <label className="field">
          <span>Hodinová sadzba (€)</span>
          <input type="number" value={f.hourlyRate} onChange={set('hourlyRate')} />
        </label>
        <label className="field">
          <span>Stav</span>
          <select value={f.status} onChange={set('status')}>
            {PROJECT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label className="field span-2">
          <span>Poznámky</span>
          <textarea rows={3} value={f.notes} onChange={set('notes')} />
        </label>
      </div>
    </Modal>
  )
}
