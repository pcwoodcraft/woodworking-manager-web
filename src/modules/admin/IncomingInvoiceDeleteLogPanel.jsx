import { useEffect, useState } from 'react'
import { apiCall } from '../../api/client'
import { ErrorBox } from '../../components/ui'
import { fmtDate, fmtMoney } from '../../utils/format'

// Audit T1-02 (zvyšok) — audit zmazaných PRIJATÝCH faktúr.
//
// Prijatá faktúra je náklad projektu, takže jej zmazanie mení maržu zákazky. Doteraz sa mazala
// jedným riadkom bez akejkoľvek stopy. Tu je vidieť, kto, kedy, ktorý doklad a prečo zmazal;
// plná kópia zostáva v databáze (nemenný záznam) a do prehliadača sa zámerne neposiela.
export default function IncomingInvoiceDeleteLogPanel() {
  const [state, setState] = useState({ loading: true, error: null })
  const [entries, setEntries] = useState([])

  const load = async () => {
    setState({ loading: true, error: null })
    try {
      const data = await apiCall('getIncomingInvoiceDeleteLog', {})
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
          <h2 style={{ marginBottom: 4 }}>Zmazané prijaté faktúry</h2>
          <p className="muted">
            Nemenný záznam o zmazaných faktúrach od dodávateľov. Ak bola faktúra priradená
            k projektu, jej zmazaním sa znížil náklad projektu a zmenila jeho marža — stĺpec
            Projekt ukazuje, ktorého sa to týka.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={load} aria-label="Obnoviť zoznam zmazaných prijatých faktúr">
          Obnoviť
        </button>
      </div>

      {state.error
        ? <ErrorBox error={state.error} onRetry={load} />
        : state.loading
          ? <p className="muted">Načítavam…</p>
          : entries.length === 0
            ? <p className="muted">Zatiaľ nebola zmazaná žiadna prijatá faktúra.</p>
            : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Kedy</th><th>Dodávateľ</th><th>Číslo</th><th className="num">Suma</th>
                    <th>Projekt</th><th>Kto</th><th>Dôvod</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id}>
                      <td>{fmtDate(e.deleted_at)}</td>
                      <td className="strong">{e.vendor || '—'}</td>
                      <td>{e.invoice_number || e.invoice_id || '—'}</td>
                      <td className="num">{e.amount_gross != null ? fmtMoney(e.amount_gross) : '—'}</td>
                      <td>{e.project_id || '—'}</td>
                      <td>{e.deleted_by_name || e.deleted_by_email || '—'}</td>
                      <td className="muted" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {e.reason || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
    </div>
  )
}
