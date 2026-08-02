import { useEffect, useMemo, useState } from 'react'
import { apiCall } from '../../api/client'
import { ErrorBox } from '../../components/ui'
import { fmtDate } from '../../utils/format'

// F4/T8-02 — čítanie posledných chýb servera priamo v aplikácii.
//
// Prečo vznikol: pravidlo „pri hlásení X nefunguje najprv prečítaj error_log" sa dalo splniť len
// skriptom s produkčným heslom, teda niečím, čo má robiť len Peter ručne. V praxi to znamenalo,
// že sa error_log nepozeral vôbec.
//
// Panel je zámerne LEN NA ČÍTANIE — žiadne mazanie ani editácia. Server nevracia stĺpec `context`
// (môže obsahovať stack alebo telo requestu) a `message` skracuje na 300 znakov; limit riadkov
// clampuje na 200 na svojej strane, takže sa odtiaľto nedá vyžiadať viac.
const LIMITY = [50, 100, 200]

export default function ErrorLogPanel() {
  const [state, setState] = useState({ loading: true, error: null })
  const [entries, setEntries] = useState([])
  const [limit, setLimit] = useState(50)
  const [filterAkcia, setFilterAkcia] = useState('')

  const load = async (opts = {}) => {
    setState({ loading: true, error: null })
    try {
      const payload = { limit: opts.limit ?? limit }
      const akcia = opts.akcia ?? filterAkcia
      if (akcia) payload.action = akcia
      const data = await apiCall('getErrorLog', payload)
      setEntries(data.entries || [])
      setState({ loading: false, error: null })
    } catch (e) {
      setState({ loading: false, error: e })
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Ponuka akcií sa skladá z toho, čo reálne prišlo — nie z pevného zoznamu, ktorý by sa
  // rozišiel s API pri každej novej akcii.
  const akcie = useMemo(() => {
    const s = new Set(entries.map(e => e.action).filter(Boolean))
    return Array.from(s).sort()
  }, [entries])

  const zmenFilter = (hodnota) => { setFilterAkcia(hodnota); load({ akcia: hodnota }) }
  const zmenLimit = (hodnota) => { setLimit(hodnota); load({ limit: hodnota }) }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-head">
        <div>
          <h2 style={{ marginBottom: 4 }}>Chyby servera (error_log)</h2>
          <p className="muted">
            Posledné chyby zapísané serverom. Keď niečo „nefunguje", pozri sa sem ako prvé —
            býva tu skutočná príčina aj so slovenskou hláškou. Len na čítanie.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => load()} aria-label="Obnoviť zoznam chýb">
          Obnoviť
        </button>
      </div>

      <div className="form-grid" style={{ marginBottom: 16 }}>
        <label className="field">
          <span>Akcia</span>
          <select value={filterAkcia} onChange={e => zmenFilter(e.target.value)}>
            <option value="">Všetky akcie</option>
            {akcie.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <small className="muted">Ponuka sa skladá z akcií v načítaných riadkoch.</small>
        </label>
        <label className="field">
          <span>Počet riadkov</span>
          <select value={limit} onChange={e => zmenLimit(Number(e.target.value))}>
            {LIMITY.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <small className="muted">Server vráti najviac 200 najnovších.</small>
        </label>
      </div>

      {state.error
        ? <ErrorBox error={state.error} onRetry={() => load()} />
        : state.loading
          ? <p className="muted">Načítavam…</p>
          : entries.length === 0
            ? (
              <p className="muted">
                {filterAkcia
                  ? 'Pre túto akciu nie sú žiadne chyby.'
                  : 'Žiadne chyby — server zatiaľ nič nezapísal.'}
              </p>
            )
            : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Čas</th><th>Akcia</th><th>Kto</th><th>Kód</th><th>Správa</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.logId}>
                      <td>{fmtDate(e.createdAt)}</td>
                      <td className="strong">{e.action || '—'}</td>
                      <td>{e.actor || '—'}</td>
                      <td>{e.errorCode || '—'}</td>
                      <td className="muted" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {e.message || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
    </div>
  )
}
