import { useEffect, useState } from 'react'
import { apiCall } from '../../api/client'
import { Spinner } from '../../components/ui'

export default function FailedSocialPostsPanel() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])

  useEffect(() => {
    apiCall('getFailedSocialPosts')
      .then(setRows)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner label="Načítavam…" />

  return (
    <div className="card">
      <h2>Problematické príspevky (diagnostika)</h2>
      <p className="muted">Len na čítanie. Akcie Pregenerovať / Zamietnuť sú v sekcii Sociálne siete.</p>
      {!rows.length ? (
        <p className="muted">Žiadne zlyhané príspevky.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>ID</th><th>Projekt</th><th>Pokusy</th><th>Chyba</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.projectId}</td>
                <td>{r.attemptCount}</td>
                <td className="err-text">{r.error}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
