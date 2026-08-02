import { useEffect, useRef, useState } from 'react'
import Modal from '../../components/Modal'
import { LOST_REASONS } from '../customers/crmConstants'

// F6/T1-01 — zrušenie projektu, ktorý má naviazaný dopyt.
//
// Doteraz zrušenie projektu s dopytom neurobilo s dopytom nič: zostal v Kanbane ako otvorený
// vo fáze „výroba"/„montáž" s pravdepodobnosťou 92/96 % a išiel do váženej hodnoty pipeline ako
// práca, ktorá sa robí. Teraz sa dopyt uzavrie ako prehratý — a keďže zrušenie zo strany zákazníka
// nie je to isté ako zrušenie z kapacitných dôvodov, dôvod musí zadať človek. Server ho vyžaduje
// tiež, takže sa nedá obísť ani priamym volaním akcie.
export default function CancelProjectModal({ onClose, onConfirm, saving }) {
  const [reason, setReason] = useState('')
  const [other, setOther] = useState('')
  const prvePole = useRef(null)

  useEffect(() => { prvePole.current?.focus() }, [])

  const mozePotvrdit = !!reason && (reason !== 'ine' || other.trim() !== '') && !saving

  const submit = () => {
    if (!mozePotvrdit) return
    onConfirm({ lostReason: reason, lostReasonOther: reason === 'ine' ? other.trim() : '' })
  }

  return (
    <Modal title="Zrušiť projekt" onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Späť</button>
        <button className="btn" onClick={submit} disabled={!mozePotvrdit}>
          {saving ? 'Ruším…' : 'Zrušiť projekt'}
        </button>
      </>}>
      <p style={{ marginBottom: 12 }}>
        K tomuto projektu je naviazaný dopyt. Zrušením projektu sa dopyt uzavrie ako
        <strong> prehratý</strong>, aby ďalej nefiguroval v pipeline ako rozpracovaná zákazka.
      </p>
      <p className="muted" style={{ marginBottom: 14 }}>
        Dôvod je povinný — zrušenie zo strany zákazníka a zrušenie z kapacitných dôvodov nie je
        to isté a z výkazov sa to spätne nedá rozlíšiť.
      </p>
      <div className="form-grid">
        <label className="field span-2">
          <span>Dôvod prehry</span>
          <select ref={prvePole} value={reason} onChange={e => setReason(e.target.value)}>
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
