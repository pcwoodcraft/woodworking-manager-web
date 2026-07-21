import { useState } from 'react'
import Modal from '../../components/Modal'
import { LOST_REASONS } from './crmConstants'

export default function LostReasonModal({ onClose, onConfirm, saving }) {
  const [reason, setReason] = useState('')
  const [other, setOther] = useState('')

  const submit = () => {
    if (!reason || (reason === 'ine' && !other.trim())) return
    onConfirm({ lostReason: reason, lostReasonOther: reason === 'ine' ? other : '' })
  }

  return (
    <Modal title="Dôvod prehry" onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
        <button className="btn" onClick={submit} disabled={saving || !reason || (reason === 'ine' && !other.trim())}>Potvrdiť prehru</button>
      </>}>
      <p className="muted" style={{ marginBottom: 14 }}>Pri presunutí do Prehrané je dôvod povinný.</p>
      <div className="form-grid">
        <label className="field span-2">
          <span>Dôvod</span>
          <select value={reason} onChange={e => setReason(e.target.value)}>
            <option value="">Vyberte dôvod</option>
            {LOST_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </label>
        {reason === 'ine' && (
          <label className="field span-2">
            <span>Upresnenie</span>
            <input value={other} onChange={e => setOther(e.target.value)} placeholder="Povinné upresnenie" />
          </label>
        )}
      </div>
    </Modal>
  )
}
