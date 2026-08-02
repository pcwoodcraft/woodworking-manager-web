import { useEffect, useRef, useState } from 'react'
import Modal from '../../components/Modal'
import { fmtMoney } from '../../utils/format'

// Audit T1-02 (zvyšok) — zmazanie PRIJATEJ faktúry.
//
// Prijatá faktúra je náklad: sčítava sa do nákladov projektu, tie idú do marže a marža
// do štatistík cenenia. Zmazanie teda mení ziskovosť zákazky — preto dôvod do auditu.
//
// Oproti vydanej faktúre sa NEŽIADA prepísať číslo dokladu: čísla dodávateľov sú dlhé
// a nepravidelné („1610852090"), takže by z toho bolo opisovanie bez úžitku. Doklad je tu
// jednoznačne identifikovaný dodávateľom a sumou, ktoré sú v dialógu vypísané.
const MIN_DOVOD = 5 // zhoduje sa s DELETE_REASON_MIN_LEN na serveri

export default function DeleteIncomingInvoiceModal({ invoice, onClose, onConfirm, saving, serverError }) {
  const [dovod, setDovod] = useState('')
  const prvePole = useRef(null)

  useEffect(() => { prvePole.current?.focus() }, [])

  const cislo = String(invoice.invoiceNumber || '').trim()
  const dovodOk = dovod.trim().length >= MIN_DOVOD
  const mozeZmazat = dovodOk && !saving

  const submit = () => {
    if (!mozeZmazat) return
    onConfirm({ reason: dovod.trim() })
  }

  return (
    <Modal title="Zmazať prijatú faktúru" onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Zrušiť</button>
        <button className="btn" onClick={submit} disabled={!mozeZmazat}>
          {saving ? 'Mažem…' : 'Zmazať faktúru'}
        </button>
      </>}>

      <p style={{ marginBottom: 12 }}>
        Faktúra <strong>{cislo || '—'}</strong> od <strong>{invoice.vendor || '—'}</strong>
        {invoice.amountGross != null && invoice.amountGross !== ''
          ? <> na sumu <strong>{fmtMoney(invoice.amountGross)}</strong></>
          : null}
        {invoice.projectName || invoice.projectId
          ? <> priradená k projektu <strong>{invoice.projectName || invoice.projectId}</strong></>
          : null}
        .
      </p>

      <ul className="muted" style={{ marginBottom: 14, paddingLeft: 18 }}>
        {invoice.projectId
          ? <li><strong>Zníži sa tým náklad projektu, teda sa zmení jeho marža.</strong></li>
          : <li>Faktúra nie je priradená k projektu, takže sa žiadna marža nemení.</li>}
        <li>PDF na Disku zostáva — nič sa nepresúva ani nemaže.</li>
        <li>Kópia faktúry sa uloží do auditu (Administrácia → Zmazané prijaté faktúry).</li>
      </ul>

      <div className="form-grid">
        <label className="field span-2">
          <span>Dôvod zmazania</span>
          <input ref={prvePole} value={dovod} onChange={e => setDovod(e.target.value)}
            placeholder="Napr. duplicita z mailu, dodávateľ ju stornoval" />
          <small className="muted">
            Povinné, aspoň {MIN_DOVOD} znakov. Uloží sa do auditu spolu s tvojím menom.
          </small>
        </label>
      </div>

      {serverError && (
        <p className="muted" style={{ marginTop: 12, color: 'var(--danger, #b00)' }}>
          {serverError}
        </p>
      )}
    </Modal>
  )
}
