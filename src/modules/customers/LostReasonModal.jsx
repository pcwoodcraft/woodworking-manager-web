import { useState } from 'react'
import Modal from '../../components/Modal'
import { LOST_REASONS } from './crmConstants'

export default function LostReasonModal({ onClose, onConfirm, saving }) {
  const [reason, setReason] = useState('cena')
  const [other, setOther] = useState('')

  const submit = () => {
    onConfirm({ lostReason: reason, lostReasonOther: reason === 'ine' ? other : '' })
  }

  return (
    <Modal title="Dôvod prehry" onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
        <button className="btn" onClick={submit} disabled={saving}>Potvrdiť prehru</button>
      </>}>
      <p className="muted" style={{ marginBottom: 14 }}>Pri presunutí do Prehrané je dôvod povinný.</p>
      <div className="form-grid">
        <label className="field span-2">
          <span>Dôvod</span>
          <select value={reason} onChange={e => setReason(e.target.value)}>
            {LOST_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </label>
        {reason === 'ine' && (
          <label className="field span-2">
            <span>Upresnenie</span>
            <input value={other} onChange={e => setOther(e.target.value)} placeholder="Voliteľné upresnenie" />
          </label>
        )}
      </div>
    </Modal>
  )
}
