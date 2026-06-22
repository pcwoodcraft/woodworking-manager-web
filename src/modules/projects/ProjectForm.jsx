import { useState } from 'react'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { apiCall } from '../../api/client'
import { PROJECT_STATUSES, normalizeStatus, toIsoDate, parseNum } from '../../utils/format'

const VAT_RATE = 23

function calcGrossFromNet(net) {
  if (!net && net !== 0) return ''
  const n = parseNum(net)
  if (!n) return ''
  return String(Math.round(n * (1 + VAT_RATE / 100) * 100) / 100)
}

function calcNetFromGross(gross) {
  if (!gross && gross !== 0) return ''
  const g = parseNum(gross)
  if (!g) return ''
  return String(Math.round(g / (1 + VAT_RATE / 100) * 100) / 100)
}

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
    priceNet: project?.priceNet || '',
    estimatedMaterialCosts: project?.estimatedMaterialCosts || '',
    estimatedHours: project?.estimatedHours || '',
    hourlyRate: project?.hourlyRate || '25',
    status: project ? normalizeStatus(project.status) : 'priprava',
    deadline: toIsoDate(project?.deadline) || '',
    priority: project?.priority || '',
    plannedStart: toIsoDate(project?.plannedStart) || '',
    notes: project?.notes || '',
  })

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const setPriceNet = (e) => {
    const val = e.target.value
    setF({ ...f, priceNet: val, price: val === '' ? '' : calcGrossFromNet(val) })
  }

  const setPriceGross = (e) => {
    const val = e.target.value
    setF({ ...f, price: val, priceNet: val === '' ? '' : calcNetFromGross(val) })
  }

  const save = async () => {
    if (!f.name.trim()) { toast('Vyplňte názov projektu', 'err'); return }
    const cust = customers.find(c => c.id === f.customerId)
    const customerName = cust
      ? [cust.firstName, cust.lastName].filter(Boolean).join(' ')
      : (project?.customer || '')
    const data = {
      name: f.name.trim(),
      customerId: f.customerId,
      customer: customerName,
      price: f.price === '' ? '' : parseNum(f.price),
      priceNet: f.priceNet === '' ? '' : parseNum(f.priceNet),
      estimatedMaterialCosts: f.estimatedMaterialCosts === '' ? '' : parseNum(f.estimatedMaterialCosts),
      estimatedHours: f.estimatedHours === '' ? '' : parseNum(f.estimatedHours),
      hourlyRate: parseNum(f.hourlyRate),
      status: f.status,
      deadline: f.deadline,
      priority: f.priority,
      plannedStart: f.plannedStart,
      notes: f.notes,
    }
    if (isEdit) data.id = project.id
    setSaving(true)
    try {
      const res = await apiCall(isEdit ? 'updateProject' : 'addProject', { project: data })
      toast(isEdit ? 'Projekt uložený' : 'Projekt pridaný' + (res?.id ? ' — ' + res.id : ''))
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
        {isEdit ? (
          <label className="field span-2">
            <span>ID projektu</span>
            <input value={project.id} disabled />
          </label>
        ) : (
          <p className="muted span-2" style={{ margin: 0 }}>
            ID priradí systém automaticky (formát P2606-001 podľa mesiaca vytvorenia).
          </p>
        )}
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
          <span>Cena bez DPH (€)</span>
          <input type="number" step="0.01" value={f.priceNet} onChange={setPriceNet} />
        </label>
        <label className="field">
          <span>Cena s DPH (€)</span>
          <input type="number" step="0.01" value={f.price} onChange={setPriceGross} />
        </label>
        <p className="muted span-2" style={{ margin: 0, fontSize: '0.85em' }}>
          Stačí vyplniť jednu cenu — druhá sa dopočíta ({VAT_RATE} % DPH).
        </p>
        <label className="field">
          <span>Termín</span>
          <input type="date" value={f.deadline} onChange={set('deadline')} />
        </label>
        <label className="field">
          <span>Priorita</span>
          <select value={f.priority} onChange={set('priority')}>
            <option value="">— bez priority —</option>
            <option value="1">1 — vysoká</option>
            <option value="2">2 — stredná</option>
            <option value="3">3 — nízka</option>
          </select>
        </label>
        <label className="field">
          <span>Plánovaný začiatok</span>
          <input type="date" value={f.plannedStart} onChange={set('plannedStart')} />
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
