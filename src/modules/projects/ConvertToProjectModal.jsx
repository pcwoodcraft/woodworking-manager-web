import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import { apiCall } from '../../api/client'

// F2/T10-01 — spoločný dialóg pre prevod ponuky aj dopytu na projekt.
//
// Doteraz to bolo `window.confirm('Vytvoriť projekt?')` a novému projektu sa v pozadí dosadila
// sadzba 25 €/h zapísaná natvrdo v kóde. Dielňa pritom účtuje 30 €/h, takže každý takto vzniknutý
// projekt vykazoval nižšie mzdové náklady a vyššiu maržu, než aká bola skutočná — a keďže sa
// sadzba nikde nezobrazovala, nemal to kto spozorovať. Preto je teraz sadzba súčasťou potvrdenia:
// predvyplní sa štandardom z nastavení, ale človek ju vidí a môže ju pred vytvorením zmeniť.
export default function ConvertToProjectModal({ title, popis, busy, onClose, onConfirm }) {
  const [sadzba, setSadzba] = useState('')
  const [standard, setStandard] = useState(null)
  const [nacitava, setNacitava] = useState(true)

  useEffect(() => {
    let zrusene = false
    apiCall('getProjectDefaults', {})
      .then(res => {
        if (zrusene) return
        const v = res?.defaultHourlyRate == null ? '' : String(res.defaultHourlyRate)
        setStandard(v || null)
        setSadzba(v)
      })
      // Predvyplnenie je pohodlie, nie podmienka — keď zlyhá, pole ostane prázdne a prevod ide ďalej.
      .catch(() => {})
      .finally(() => { if (!zrusene) setNacitava(false) })
    return () => { zrusene = true }
  }, [])

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Zrušiť</button>
        <button className="btn" onClick={() => onConfirm({ hourlyRate: sadzba })} disabled={busy || nacitava}>
          {busy ? 'Vytvára sa…' : 'Vytvoriť projekt'}
        </button>
      </>}
    >
      <p style={{ marginTop: 0, marginBottom: 14 }}>{popis}</p>

      <div className="form-grid">
        <label className="field">
          <span>Hodinová sadzba projektu (€/h)</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={sadzba}
            placeholder={nacitava ? 'Načítavam…' : 'napr. 30'}
            onChange={e => setSadzba(e.target.value)}
          />
        </label>
      </div>

      {sadzba === '' && !nacitava ? (
        <p className="budget-label-warn" style={{ marginTop: 10, marginBottom: 0 }}>
          Bez sadzby sa odpracované hodiny nezapočítajú do nákladov ani do marže projektu.
          Doplniť sa dá kedykoľvek neskôr v úprave projektu.
        </p>
      ) : (
        <p className="muted" style={{ marginTop: 10, marginBottom: 0 }}>
          {standard && sadzba === standard
            ? 'Predvyplnené štandardom dielne. Platí len pre tento projekt — zmeniť sa dá aj neskôr.'
            : 'Platí len pre tento projekt — zmeniť sa dá aj neskôr v úprave projektu.'}
        </p>
      )}
    </Modal>
  )
}
