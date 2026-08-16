import { useEffect, useRef, useState } from 'react'
import Modal from '../../components/Modal'
import { fmtMoney, parseNum } from '../../utils/format'

// Audit T1-02(b) — vystavenie opravného dokladu k vydanej faktúre.
//
// Rozhodnutia vlastníka (2. 8. 2026), ktoré tento dialóg presadzuje aj vizuálne:
//   • STORNO ruší faktúru celú a smie sa len na NEUHRADENÚ,
//   • DOBROPIS znižuje sumu (čiastočne aj úplne) a smie sa aj na uhradenú.
// Preto sa pri uhradenej faktúre voľba „storno" vôbec neponúka — server ju odmietne, ale
// je lepšie neponúknuť cestu, ktorá nikam nevedie, než na nej používateľa nechať naraziť.
const MIN_DOVOD = 5
const INVOICE_CONFIGURATION_REASON = 'Najprv treba doplniť platnú daňovú a fakturačnú konfiguráciu.'

export default function CreditNoteModal({ invoice, uhradene, onClose, onConfirm, saving, serverError, creationAllowed = false }) {
  const jeUhradena = Number(uhradene || 0) > 0
  const [typ, setTyp] = useState(jeUhradena ? 'dobropis' : 'storno')
  const [suma, setSuma] = useState('')
  const [dovod, setDovod] = useState('')
  const prvePole = useRef(null)

  useEffect(() => { prvePole.current?.focus() }, [])

  const cislo = String(invoice.number || '').trim()
  const celkom = Math.abs(parseNum(invoice.amountNet ?? invoice.amount ?? 0))
  const dovodOk = dovod.trim().length >= MIN_DOVOD
  const sumaOk = typ === 'storno' || parseNum(suma) > 0
  const mozem = creationAllowed && dovodOk && sumaOk && !saving

  const submit = () => {
    if (!creationAllowed) return
    if (!mozem) return
    onConfirm({
      type: typ,
      reason: dovod.trim(),
      ...(typ === 'dobropis' ? { amountNet: suma } : {}),
    })
  }

  return (
    <Modal title={'Opravný doklad k faktúre ' + (cislo || '')} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Zrušiť</button>
        <button
          className="btn"
          onClick={submit}
          disabled={!mozem}
          title={!creationAllowed ? INVOICE_CONFIGURATION_REASON : undefined}
          aria-describedby={!creationAllowed ? 'credit-note-configuration-reason' : undefined}
        >
          {saving ? 'Vystavuje sa…' : 'Vystaviť doklad'}
        </button>
      </>}>

      {!creationAllowed && (
        <p id="credit-note-configuration-reason" className="budget-label-warn">{INVOICE_CONFIGURATION_REASON}</p>
      )}

      <p style={{ marginTop: 0, marginBottom: 12 }}>
        Faktúra <strong>{cislo || '—'}</strong> pre <strong>{invoice.customer || '—'}</strong> na
        {' '}<strong>{fmtMoney(celkom)}</strong> bez DPH.
        {jeUhradena && <> Uhradené: <strong>{fmtMoney(uhradene)}</strong>.</>}
      </p>

      {jeUhradena ? (
        <p className="muted" style={{ marginBottom: 14 }}>
          Faktúra je uhradená, takže sa stornovať nedá — vystavuje sa k nej dobropis.
          Inkaso projektu sa zníži až vtedy, keď zaznamenáš skutočné vrátenie peňazí.
        </p>
      ) : (
        <div className="form-grid" style={{ marginBottom: 4 }}>
          <label className="field span-2">
            <span>Typ dokladu</span>
            <select value={typ} onChange={e => setTyp(e.target.value)}>
              <option value="storno">Storno — ruší celú faktúru</option>
              <option value="dobropis">Dobropis — znižuje sumu</option>
            </select>
          </label>
        </div>
      )}

      <div className="form-grid">
        {typ === 'dobropis' && (
          <label className="field">
            <span>Suma dobropisu bez DPH (€)</span>
            <input ref={jeUhradena ? prvePole : null} type="number" step="0.01" min="0"
              value={suma} onChange={e => setSuma(e.target.value)} placeholder={String(celkom)} />
            <small className="muted">Najviac {fmtMoney(celkom)} — spolu za všetky dobropisy k tejto faktúre.</small>
          </label>
        )}

        <label className="field span-2">
          <span>Dôvod opravy</span>
          <input ref={jeUhradena ? null : prvePole} value={dovod} onChange={e => setDovod(e.target.value)}
            placeholder="Napr. zlá suma, reklamácia madla, vystavené omylom" />
          <small className="muted">
            Povinné, aspoň {MIN_DOVOD} znakov. <b>Vytlačí sa na doklade</b> a uvidí ho zákazník aj účtovníčka.
          </small>
        </label>
      </div>

      <ul className="muted" style={{ marginTop: 12, marginBottom: 0, paddingLeft: 18 }}>
        <li>Doklad dostane číslo z vlastného radu (D…), rad faktúr zostane súvislý.</li>
        <li>Sumy na doklade sú záporné a PDF sa uloží na Disk.</li>
        {typ === 'storno'
          ? <li>Pôvodná faktúra sa označí ako <b>Stornovaná</b> a vypadne z pohľadávok.</li>
          : <li>Pôvodná faktúra zostáva — dobropis len znižuje jej sumu.</li>}
      </ul>

      {serverError && (
        <p className="muted" style={{ marginTop: 12, color: 'var(--danger, #b00)' }}>{serverError}</p>
      )}
    </Modal>
  )
}
