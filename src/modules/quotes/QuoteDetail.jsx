import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../components/Toast'
import { Spinner, ErrorBox } from '../../components/ui'
import { fmtDate, fmtMoney } from '../../utils/format'
import { quoteStatusLabel, quoteTaxModeLabel } from './quoteConstants'
import QuoteForm from './QuoteForm'
import QuoteVisualizations from './QuoteVisualizations'
import DeleteQuoteModal from './DeleteQuoteModal'

// Modál patrí modulu projektov — načíta sa až keď ho používateľ naozaj otvorí, aby balík ponúk
// neobsahoval kód projektov (fáza 2b, Úloha C0).
const ConvertToProjectModal = lazy(() => import('../projects/ConvertToProjectModal'))

export default function QuoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { can, hasModule } = useAuth()
  const [mode, setMode] = useState('view')
  const [state, setState] = useState({ loading: true, error: null })
  const [data, setData] = useState(null)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [projectBusy, setProjectBusy] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [zrusenieOpen, setZrusenieOpen] = useState(false)
  const [zrusujem, setZrusujem] = useState(false)
  const [chybaZrusenia, setChybaZrusenia] = useState('')

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

  // F2/T10-01: potvrdenie prevodu je dialog, nie window.confirm — sadzba nového projektu
  // musí byť pred vytvorením vidieť a musí sa dať zmeniť.
  const convertProject = async ({ hourlyRate }) => {
    setProjectBusy(true)
    try {
      const res = await apiCall('convertQuoteToProject', { quoteId: id, hourlyRate })
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
    if (state.error) return <ErrorBox error={state.error} onRetry={load} />
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
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  if (!data) return null

  const q = data.quote
  const canProject = can('perm_projects_write') && q.status === 'prijata' && !q.projectId
  // Modul sa k právu PRIDÁVA, nenahrádza ho: bez `perm_projects_write` sa prevod nedá spustiť ani
  // pri zapnutom module. `mozePreviest` drží aj tlačidlo, aj render — inak by React stiahol chunk
  // projektov len preto, že sa dá otvoriť stav `convertOpen`.
  const mozePreviest = canProject && hasModule('projects')
  const canDeleteQuote = can('perm_customers')

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
        {mozePreviest && (
          <button type="button" className="btn" onClick={() => setConvertOpen(true)} disabled={projectBusy}>
            {projectBusy ? 'Vytvára sa…' : 'Vytvoriť projekt'}
          </button>
        )}
        {q.projectId && (
          <Link className="btn btn-secondary" to={'/projekty/' + q.projectId}>Projekt {q.projectId}</Link>
        )}
        {canDeleteQuote && !q.projectId && q.status !== 'zrusena' && (
          <button type="button" className="btn btn-secondary"
            onClick={() => { setChybaZrusenia(''); setZrusenieOpen(true) }}>
            {q.pdfUrl ? 'Zrušiť ponuku' : 'Zmazať ponuku'}
          </button>
        )}
      </div>

      {zrusenieOpen && (
        <DeleteQuoteModal
          quote={q}
          saving={zrusujem}
          serverError={chybaZrusenia}
          onClose={() => { if (!zrusujem) { setZrusenieOpen(false); setChybaZrusenia('') } }}
          onConfirm={async () => {
            if (zrusujem) return
            setZrusujem(true); setChybaZrusenia('')
            try {
              await apiCall('deleteQuote', { id })
              const malaPdf = !!q.pdfUrl
              // Ponuka s PDF sa nemaže, len sa preklopí do stavu Zrušená — preto sa zostáva
              // na detaile a znova načíta; bez PDF riadok zmizne, takže sa vraciame do zoznamu.
              toast(malaPdf ? 'Ponuka zrušená.' : 'Ponuka zmazaná.')
              setZrusenieOpen(false)
              if (malaPdf) await load()
              else navigate('/zakaznici/ponuky')
            } catch (e) {
              setChybaZrusenia(e.message || 'Nepodarilo sa to.')
            } finally {
              setZrusujem(false)
            }
          }}
        />
      )}

      {mozePreviest && convertOpen && (
        <Suspense fallback={<Spinner label="Načítavam…" />}>
          <ConvertToProjectModal
            title="Vytvoriť projekt z ponuky"
            popis={'Z ponuky ' + (q.id || id) + ' vznikne nový projekt vrátane ceny a priečinka na Drive.'}
            busy={projectBusy}
            onClose={() => setConvertOpen(false)}
            onConfirm={convertProject}
          />
        </Suspense>
      )}

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
                  {it.descDetail && <div className="muted" style={{ whiteSpace: 'pre-line', fontSize: '0.9em' }}>{it.descDetail}</div>}
                  {it.descDetailSecondary && <div className="muted" style={{ whiteSpace: 'pre-line', fontSize: '0.9em' }}>{it.descDetailSecondary}</div>}
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
