import { useState } from 'react'
import Modal from '../../components/Modal'
import { ACTIVITY_TYPES } from './crmConstants'

export default function DealMoveModal({ title = 'Čo sa stalo?', saving, confirmDisabled = false, onClose, onConfirm, children }) {
  const [f, setF] = useState({ type: 'telefon', outcome: '', notes: '', nextStep: '', followUpDate: '' })
  const valid = f.type && f.outcome.trim()
  return <Modal title={title} onClose={onClose} footer={<>
    <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
    <button className="btn" disabled={saving || !valid || confirmDisabled} onClick={() => onConfirm(f)}>Potvrdiť zmenu</button>
  </>}>
    <div className="form-grid">
      <label className="field"><span>Typ aktivity</span><select value={f.type} onChange={e => setF({...f,type:e.target.value})}>
        {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select></label>
      <label className="field"><span>Výsledok / dôvod</span><input value={f.outcome} onChange={e => setF({...f,outcome:e.target.value})} /></label>
      <label className="field span-2"><span>Poznámka</span><textarea rows={2} value={f.notes} onChange={e => setF({...f,notes:e.target.value})} /></label>
      <label className="field"><span>Ďalší krok</span><input value={f.nextStep} onChange={e => setF({...f,nextStep:e.target.value})} /></label>
      <label className="field"><span>Follow-up dátum</span><input type="date" value={f.followUpDate} onChange={e => setF({...f,followUpDate:e.target.value})} /></label>
      {children}
    </div>
  </Modal>
}
