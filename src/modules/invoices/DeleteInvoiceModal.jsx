import { useEffect, useRef, useState } from 'react'
import Modal from '../../components/Modal'
import { fmtMoney } from '../../utils/format'

// F5/T1-02 — zmazanie vydanej faktúry.
//
// Mazanie je nezvratné a je na zodpovednosti jedného menovaného človeka (právo perm_invoices_delete
// môže mať naraz len jeden aktívny používateľ — vynucuje to index v databáze). Dialóg preto:
//   • vypíše konkrétne dôsledky, nie generické „Naozaj?",
//   • žiada dôvod (ide do nemenného auditu),
//   • žiada prepísať číslo faktúry, aby sa nedalo zmazať omylom nesprávny doklad.
const MIN_DOVOD = 5 // zhoduje sa s DELETE_REASON_MIN_LEN na serveri

export default function DeleteInvoiceModal({ invoice, onClose, onConfirm, saving, serverError }) {
  const [dovod, setDovod] = useState('')
  const [potvrdenie, setPotvrdenie] = useState('')
  const prvePole = useRef(null)

  useEffect(() => { prvePole.current?.focus() }, [])

  const cislo = String(invoice.number || invoice.invoiceNumber || '').trim()
  const cisloSedi = potvrdenie.trim() === cislo
  const dovodOk = dovod.trim().length >= MIN_DOVOD
  const mozeZmazat = cisloSedi && dovodOk && !saving

  const submit = () => {
    if (!mozeZmazat) return
    onConfirm({ reason: dovod.trim() })
  }

  return (
    <Modal title={'Zmazať faktúru ' + (cislo || '')} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Zrušiť</button>
        <button className="btn" onClick={submit} disabled={!mozeZmazat}>
          {saving ? 'Mažem…' : 'Zmazať faktúru'}
        </button>
      </>}>

      <p style={{ marginBottom: 12 }}>
        Faktúra <strong>{cislo || '—'}</strong>
        {invoice.customer ? <> pre <strong>{invoice.customer}</strong></> : null}
        {invoice.amountNet != null && invoice.amountNet !== ''
          ? <> na sumu <strong>{fmtMoney(invoice.amountNet)}</strong></>
          : null}
        {' '}sa zmaže aj s položkami.
      </p>

      <ul className="muted" style={{ marginBottom: 14, paddingLeft: 18 }}>
        <li>Číslo <strong>{cislo || '—'}</strong> sa do radu automaticky nevráti.</li>
        <li>PDF súbory zostávajú na Disku — nič sa nepresúva ani nemaže.</li>
        <li>Kópia faktúry aj položiek sa uloží do auditu (Administrácia → Zmazané faktúry).</li>
      </ul>

      <div className="form-grid">
        <label className="field span-2">
          <span>Dôvod zmazania</span>
          <input ref={prvePole} value={dovod} onChange={e => setDovod(e.target.value)}
            placeholder="Napr. zlá suma, vystavené omylom" />
          <small className="muted">
            Povinné, aspoň {MIN_DOVOD} znakov. Uloží sa do auditu spolu s tvojím menom.
          </small>
        </label>

        <label className="field span-2">
          <span>Potvrdenie — prepíš číslo faktúry</span>
          <input value={potvrdenie} onChange={e => setPotvrdenie(e.target.value)}
            placeholder={cislo} autoComplete="off" />
          <small className="muted">
            {cisloSedi
              ? 'Číslo sedí.'
              : 'Napíš presne ' + (cislo || 'číslo faktúry') + ', aby sa nedal zmazať nesprávny doklad.'}
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
