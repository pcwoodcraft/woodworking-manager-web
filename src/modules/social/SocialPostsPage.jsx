import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { Spinner, ErrorBox } from '../../components/ui'
import { useToast } from '../../components/Toast'

function PostRow({ post, onOpen }) {
  const badge = post.status === 'failed' ? 'failed' : post.status === 'approved' ? 'error' : 'ok'
  return (
    <tr className="clickable" onClick={() => onOpen(post.id)}>
      <td>{post.projectName}</td>
      <td><span className={`badge badge-${badge}`}>{post.status}</span></td>
      <td>{post.photoCount}</td>
      <td className="muted">{post.captionText || '—'}</td>
      {post.error && <td className="err-text">{post.error.substring(0, 60)}</td>}
    </tr>
  )
}

export default function SocialPostsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState({ generated: [], failed: [], sendErrors: [] })

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setData(await apiCall('getSocialPostsPage'))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const open = (id) => navigate(`/socialne-siete/${id}`)

  if (loading) return <Spinner label="Načítavam príspevky…" />
  if (error) return <ErrorBox message={error} onRetry={load} />

  const Section = ({ title, rows, empty }) => (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2>{title}</h2>
      {!rows.length ? <p className="muted">{empty}</p> : (
        <table className="data-table">
          <thead>
            <tr><th>Projekt</th><th>Stav</th><th>Fotky</th><th>Náhľad textu</th></tr>
          </thead>
          <tbody>
            {rows.map(p => <PostRow key={p.id} post={p} onOpen={open} />)}
          </tbody>
        </table>
      )}
    </div>
  )

  return (
    <div className="page">
      <header className="page-head">
        <h1>Sociálne siete</h1>
        <button className="btn btn-secondary" onClick={load}>Obnoviť</button>
      </header>
      <Section title="Na schválenie" rows={data.generated} empty="Žiadne príspevky na schválenie." />
      <Section title="Chyba odoslania" rows={data.sendErrors} empty="Žiadne chyby odoslania." />
      <Section title="Zlyhané generovanie" rows={data.failed} empty="Žiadne zlyhané príspevky." />
    </div>
  )
}
