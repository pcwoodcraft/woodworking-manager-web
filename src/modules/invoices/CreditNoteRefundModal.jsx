import { useEffect, useRef, useState } from 'react'
import Modal from '../../components/Modal'
import { fmtMoney, parseNum } from '../../utils/format'

// Audit T1-02(b) — zápis SKUTOČNÉHO vrátenia peňazí z dobropisu.
//
// Rozhodnutie vlastníka (3. 8. 2026): „dobropis znižuje inkaso projektu, ale až po reálnej
// úhrade." Vystavenie dokladu teda inkasom nehýbe — až tento zápis. Je to to isté rozlíšenie
// ako pri bežnej faktúre: vystavená ≠ uhradená.
export default function CreditNoteRefundModal({ note, uzVratene, onClose, onConfirm, saving, serverError }) {
  const celkom = Math.abs(parseNum(note.amountNet ?? note.amount ?? 0))
  const zostatok = Math.max(0, Math.round((celkom - Math.abs(parseNum(uzVratene || 0))) * 100) / 100)
  const [suma, setSuma] = useState(String(zostatok || ''))
  const [datum, setDatum] = useState(new Date().toISOString().slice(0, 10))
  const prvePole = useRef(null)

  useEffect(() => { prvePole.current?.focus() }, [])

  const zadana = parseNum(suma)
  const mozem = zadana > 0 && zadana <= zostatok + 0.01 && !saving

  return (
    <Modal title={'Vrátenie peňazí — ' + String(note.number || '')} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Zrušiť</button>
        <button className="btn" onClick={() => mozem && onConfirm({ amountNet: suma, paidDate: datum })} disabled={!mozem}>
          {saving ? 'Zapisuje sa…' : 'Zaznamenať vrátenie'}
        </button>
      </>}>

      <p style={{ marginTop: 0, marginBottom: 12 }}>
        Dobropis <strong>{note.number}</strong> je na <strong>{fmtMoney(celkom)}</strong> bez DPH.
        {Math.abs(parseNum(uzVratene || 0)) > 0 && <> Už vrátené: <strong>{fmtMoney(Math.abs(parseNum(uzVratene)))}</strong>.</>}
      </p>

      <p className="muted" style={{ marginBottom: 14 }}>
        Zapíš to až vtedy, keď peniaze zákazníkovi naozaj odišli. Týmto sa <b>zníži inkaso
        projektu</b> a prepočíta sa jeho marža.
      </p>

      <div className="form-grid">
        <label className="field">
          <span>Vrátená suma bez DPH (€)</span>
          <input ref={prvePole} type="number" step="0.01" min="0" value={suma}
            onChange={e => setSuma(e.target.value)} />
          <small className={zadana > zostatok + 0.01 ? 'budget-label-warn' : 'muted'}>
            Najviac {fmtMoney(zostatok)} spolu za všetky vrátenia k tomuto dokladu.
          </small>
        </label>
        <label className="field">
          <span>Dátum vrátenia</span>
          <input type="date" value={datum} onChange={e => setDatum(e.target.value)} />
        </label>
      </div>

      {serverError && (
        <p className="muted" style={{ marginTop: 12, color: 'var(--danger, #b00)' }}>{serverError}</p>
      )}
    </Modal>
  )
}
