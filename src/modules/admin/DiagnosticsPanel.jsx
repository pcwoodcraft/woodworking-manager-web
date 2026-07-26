import { useState } from 'react'
import { apiCall, getApiTimings, clearApiTimings } from '../../api/client'
import { useToast } from '../../components/Toast'

export default function DiagnosticsPanel() {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [server, setServer] = useState(null)
  const [clientTimings, setClientTimings] = useState(() => getApiTimings())

  const refreshClient = () => setClientTimings(getApiTimings())

  const runServer = async () => {
    setBusy(true)
    try {
      // API-01 (audit 2607): getSystemDiagnostics meralo listy Google Sheets a po migrácii na
      // Supabase v edge API neexistuje. getPerfBenchmark je jeho zmysluplný nástupca (benchmark
      // kľúčových DB čítaní) → { generatedAt, timings:[{action,ms,ok}] }.
      setServer(await apiCall('getPerfBenchmark'))
      refreshClient()
      toast('Diagnostika dokončená')
    } catch (e) {
      toast('Diagnostika zlyhala: ' + e.message, 'err')
    } finally {
      setBusy(false)
    }
  }

  const clientSummary = () => {
    if (!clientTimings.length) return null
    const byAction = {}
    clientTimings.forEach(t => {
      if (!byAction[t.action]) byAction[t.action] = []
      byAction[t.action].push(t.ms)
    })
    return Object.entries(byAction)
      .map(([action, ms]) => ({
        action,
        count: ms.length,
        avg: Math.round(ms.reduce((a, b) => a + b, 0) / ms.length),
        max: Math.max(...ms),
      }))
      .sort((a, b) => b.max - a.max)
  }

  const summary = clientSummary()

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-head">
        <h2>Diagnostika výkonu</h2>
        <div className="btn-group">
          <button className="btn btn-sm btn-secondary" onClick={() => { clearApiTimings(); refreshClient() }}>
            Vymazať log klienta
          </button>
          <button className="btn btn-sm" disabled={busy} onClick={runServer}>
            {busy ? 'Meriam…' : 'Spustiť server diagnostiku'}
          </button>
        </div>
      </div>
      <p className="muted" style={{ marginBottom: 12 }}>
        Klient automaticky meria trvanie API volaní v tejto relácii. Server diagnostika premeria
        benchmark kľúčových DB čítaní (môže trvať 10–30 s).
      </p>

      {summary && summary.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>Posledné volania z prehliadača (priemer / max ms)</h3>
          <table className="table" style={{ marginBottom: 16 }}>
            <thead><tr><th>Akcia</th><th>Počet</th><th>Priemer</th><th>Max</th></tr></thead>
            <tbody>
              {summary.map(row => (
                <tr key={row.action}>
                  <td><code>{row.action}</code></td>
                  <td>{row.count}</td>
                  <td className={row.avg >= 3000 ? 'overdue' : ''}>{row.avg} ms</td>
                  <td className={row.max >= 5000 ? 'overdue' : ''}>{row.max} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {server && (
        <>
          <p className="muted" style={{ marginBottom: 8 }}>Server benchmark: {server.generatedAt}</p>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>Benchmark kľúčových DB čítaní na serveri</h3>
          <table className="table">
            <thead><tr><th>Akcia</th><th>ms</th></tr></thead>
            <tbody>
              {(server.timings || []).map(a => (
                <tr key={a.action}>
                  <td>{a.action}</td>
                  <td className={a.ms >= 2000 ? 'overdue' : ''}>{a.ms}{a.ok === false ? ' (chyba)' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
