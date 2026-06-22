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
      setServer(await apiCall('getSystemDiagnostics'))
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
        Klient automaticky meria trvanie API volaní v tejto relácii. Server diagnostika premeria listy v tabuľke
        a benchmark kľúčových akcií (môže trvať 10–30 s).
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
          <p className="muted" style={{ marginBottom: 8 }}>
            Server: {server.generatedAt} · otvorenie tabuľky {server.spreadsheetOpenMs} ms · celkom {server.totalMs} ms
          </p>
          {server.recommendations?.length > 0 && (
            <ul style={{ marginBottom: 16, paddingLeft: 20 }}>
              {server.recommendations.map((r, i) => <li key={i} style={{ marginBottom: 6 }}>{r}</li>)}
            </ul>
          )}
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>Listy v tabuľke (zoradené podľa času čítania)</h3>
          <table className="table" style={{ marginBottom: 16 }}>
            <thead>
              <tr>
                <th>List</th>
                <th>Riadky dát</th>
                <th>lastRow</th>
                <th>getDataRange riadkov</th>
                <th>Čítanie ms</th>
                <th>Problém</th>
              </tr>
            </thead>
            <tbody>
              {(server.sheets || []).filter(s => s.exists).map(s => (
                <tr key={s.name}>
                  <td>{s.name}</td>
                  <td>{s.dataRows}</td>
                  <td>{s.lastRow}</td>
                  <td className={s.bloated ? 'overdue' : ''}>{s.getDataRangeRows || '—'}</td>
                  <td className={s.readMs >= 500 ? 'overdue' : ''}>{s.readMs}</td>
                  <td>{s.bloated ? '⚠ nafúknutý rozsah' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>Benchmark akcií na serveri</h3>
          <table className="table">
            <thead><tr><th>Akcia</th><th>ms</th></tr></thead>
            <tbody>
              {(server.actionTimings || []).map(a => (
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
