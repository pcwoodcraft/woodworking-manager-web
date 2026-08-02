import { useEffect, useState } from 'react'
import { apiCall } from '../../api/client'
import { ErrorBox } from '../../components/ui'
import { fmtDate } from '../../utils/format'

// F5/T1-02 — audit zmazaných vydaných faktúr.
//
// Mazanie faktúry je nezvratné a smie ho robiť jeden menovaný človek. Táto tabuľka je to, čo
// z toho zostáva dohľadateľné: kto, kedy, ktorú faktúru a prečo. Plná kópia faktúry aj položiek
// je uložená v databáze (nemenný záznam), do prehliadača sa zámerne neposiela — tu stačí prehľad.
export default function InvoiceDeleteLogPanel() {
  const [state, setState] = useState({ loading: true, error: null })
  const [entries, setEntries] = useState([])

  const load = async () => {
    setState({ loading: true, error: null })
    try {
      const data = await apiCall('getInvoiceDeleteLog', {})
      setEntries(data.entries || [])
      setState({ loading: false, error: null })
    } catch (e) {
      setState({ loading: false, error: e })
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-head">
        <div>
          <h2 style={{ marginBottom: 4 }}>Zmazané faktúry</h2>
          <p className="muted">
            Nemenný záznam o zmazaných vydaných faktúrach. Plná kópia faktúry aj položiek zostáva
            uložená v databáze — z tejto tabuľky je vidieť, kto a prečo doklad zmazal.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={load} aria-label="Obnoviť zoznam zmazaných faktúr">
          Obnoviť
        </button>
      </div>

      {state.error
        ? <ErrorBox error={state.error} onRetry={load} />
        : state.loading
          ? <p className="muted">Načítavam…</p>
          : entries.length === 0
            ? <p className="muted">Zatiaľ nebola zmazaná žiadna faktúra.</p>
            : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Kedy</th><th>Faktúra</th><th>Kto</th><th>Dôvod</th>
                    <th className="num">Odpojené úhrady</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id}>
                      <td>{fmtDate(e.deleted_at)}</td>
                      <td className="strong">{e.invoice_number || e.invoice_id || '—'}</td>
                      <td>{e.deleted_by_name || e.deleted_by_email || '—'}</td>
                      <td className="muted" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {e.reason || '—'}
                      </td>
                      <td className="num">{e.unlinked_payments_count || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
    </div>
  )
}
