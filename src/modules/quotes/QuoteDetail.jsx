import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../components/Toast'
import { Spinner, ErrorBox } from '../../components/ui'
import { fmtDate, fmtMoney } from '../../utils/format'
import { quoteStatusLabel, quoteTaxModeLabel } from './quoteConstants'
import QuoteForm from './QuoteForm'
import QuoteVisualizations from './QuoteVisualizations'

export default function QuoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = useAuth()
  const [mode, setMode] = useState('view')
  const [state, setState] = useState({ loading: true, error: null })
  const [data, setData] = useState(null)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [projectBusy, setProjectBusy] = useState(false)

  const load = async () => {
    setState({ loading: true, error: null })
    try {
      const res = await apiCall('getQuote', { id })
      setData(res)
      setState({ loading: false, error: null })
    } catch (e) {
      setState({ loading: false, error: e.message })
    }
  }

  useEffect(() => { load() }, [id])

  const generatePdf = async () => {
    setPdfBusy(true)
    try {
      const res = await apiCall('generateQuotePdf', { quoteId: id })
      toast('PDF vygenerované')
      if (res.pdfUrl) window.open(res.pdfUrl, '_blank')
      await load()
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setPdfBusy(false)
    }
  }

  const convertProject = async () => {
    if (!window.confirm('Vytvoriť projekt z tejto ponuky?')) return
    setProjectBusy(true)
    try {
      const res = await apiCall('convertQuoteToProject', { quoteId: id })
      if (res.driveWarning) toast('Projekt vytvorený, ale Drive: ' + res.driveWarning)
      else toast('Projekt vytvorený')
      navigate('/projekty/' + res.projectId)
    } catch (e) {
      toast(e.message, 'err')
      setProjectBusy(false)
    }
  }

  if (mode === 'edit') {
    if (state.loading) return <Spinner label="Načítava sa…" />
    if (state.error) return <ErrorBox message={state.error} onRetry={load} />
    return (
      <>
        <header className="page-head">
          <h1>Upraviť ponuku</h1>
        </header>
        {data?.quote && (
          <QuoteVisualizations
            quoteId={id}
            quote={data.quote}
            frozen={data.quote.isFrozen}
            onUpdated={load}
          />
        )}
        <QuoteForm
          quoteId={id}
          onSaved={() => { setMode('view'); load() }}
          onCancel={() => setMode('view')}
        />
      </>
    )
  }

  if (state.loading) return <Spinner label="Načítava sa…" />
  if (state.error) return <ErrorBox message={state.error} onRetry={load} />
  if (!data) return null

  const q = data.quote
  const canProject = can('perm_projects_write') && q.status === 'prijata' && !q.projectId

  return (
    <>
      <header className="page-head">
        <p className="breadcrumb muted">
          <Link to="/zakaznici/ponuky">Cenové ponuky</Link> / {q.quoteNumber || q.id}
        </p>
        <h1>{q.quoteNumber || q.id} — {q.projectName || 'Ponuka'}</h1>
      </header>

      <div className="btn-group" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        {!q.isFrozen && (
          <button type="button" className="btn btn-secondary" onClick={() => setMode('edit')}>Upraviť</button>
        )}
        <button type="button" className="btn" onClick={generatePdf} disabled={pdfBusy}>
          {pdfBusy ? 'Generuje sa…' : (q.pdfUrl && !q.pdfStale ? 'Pre-generovať PDF' : 'Generovať PDF')}
        </button>
        {q.pdfUrl && (
          <a className="btn btn-secondary" href={q.pdfUrl} target="_blank" rel="noreferrer">Otvoriť PDF</a>
        )}
        {canProject && (
          <button type="button" className="btn" onClick={convertProject} disabled={projectBusy}>
            {projectBusy ? 'Vytvára sa…' : 'Vytvoriť projekt'}
          </button>
        )}
        {q.projectId && (
          <Link className="btn btn-secondary" to={'/projekty/' + q.projectId}>Projekt {q.projectId}</Link>
        )}
      </div>

      {q.pdfStale && q.pdfUrl && (
        <p className="muted" style={{ marginBottom: 12 }}>PDF je neaktuálne — pregenerujte ho pred odoslaním.</p>
      )}
      {q.isExpired && (
        <p className="muted" style={{ marginBottom: 12 }}>Ponuka je po lehote platnosti.</p>
      )}

      <div className="card">
        <div className="detail-grid">
          <div><span className="muted">Zákazník</span><div>{q.customerName || '—'}</div></div>
          <div><span className="muted">Stav</span><div>{quoteStatusLabel(q.status)}</div></div>
          <div><span className="muted">Dátum</span><div>{fmtDate(q.issueDate)}</div></div>
          <div><span className="muted">Daňový režim</span><div>{quoteTaxModeLabel(q.taxMode)}</div></div>
          <div><span className="muted">Netto</span><div>{fmtMoney(q.totalNet)}</div></div>
          <div><span className="muted">Brutto</span><div>{fmtMoney(q.totalGross)}</div></div>
        </div>
      </div>

      <QuoteVisualizations
        quoteId={id}
        quote={q}
        frozen={q.isFrozen}
        onUpdated={load}
      />

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Položky</h3>
        <table className="table">
          <thead>
            <tr><th>Popis</th><th className="num">Netto</th><th className="num">DPH</th><th className="num">Brutto</th></tr>
          </thead>
          <tbody>
            {(data.items || []).map(it => (
              <tr key={it.id}>
                <td>
                  <strong>{it.descPrimary}</strong>
                  {it.descSecondary && <div className="muted">{it.descSecondary}</div>}
                </td>
                <td className="num">{fmtMoney(it.lineNet)}</td>
                <td className="num">{fmtMoney(it.lineVat)}</td>
                <td className="num">{fmtMoney(it.lineGross)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
