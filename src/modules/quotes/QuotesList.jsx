import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { Spinner, ErrorBox } from '../../components/ui'
import { fmtDate, fmtMoney } from '../../utils/format'
import { quoteStatusLabel } from './quoteConstants'

export default function QuotesList() {
  const navigate = useNavigate()
  const [state, setState] = useState({ loading: true, error: null })
  const [quotes, setQuotes] = useState([])
  const [filter, setFilter] = useState('')

  const load = async () => {
    setState({ loading: true, error: null })
    try {
      const data = await apiCall('getQuotesPage')
      setQuotes(data.quotes || [])
      setState({ loading: false, error: null })
    } catch (e) {
      setState({ loading: false, error: e.message })
    }
  }

  useEffect(() => { load() }, [])

  const filtered = quotes.filter(q => {
    if (!filter.trim()) return true
    const s = filter.toLowerCase()
    return (
      String(q.quoteNumber || '').toLowerCase().includes(s)
      || String(q.projectName || '').toLowerCase().includes(s)
      || String(q.customerName || '').toLowerCase().includes(s)
    )
  })

  if (state.loading) return <Spinner label="Načítava sa…" />
  if (state.error) return <ErrorBox message={state.error} onRetry={load} />

  return (
    <>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <p className="muted" style={{ margin: 0 }}>Číslo CP sa pridelí pri uložení novej ponuky.</p>
        <button type="button" className="btn" onClick={() => navigate('/zakaznici/ponuky/nova')}>+ Nová ponuka</button>
      </div>
      <div className="filter-bar">
        <input
          placeholder="Hľadať číslo, projekt, zákazníka…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Číslo</th>
              <th>Zákazník</th>
              <th>Projekt</th>
              <th>Stav</th>
              <th className="num">Suma</th>
              <th>Dátum</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="muted">Žiadne ponuky.</td></tr>
            ) : filtered.map(q => (
              <tr key={q.id} className="clickable" onClick={() => navigate('/zakaznici/ponuky/' + q.id)}>
                <td><Link to={'/zakaznici/ponuky/' + q.id} onClick={e => e.stopPropagation()}>{q.quoteNumber || q.id}</Link></td>
                <td>{q.customerName || '—'}</td>
                <td>{q.projectName || '—'}</td>
                <td>
                  {quoteStatusLabel(q.status)}
                  {q.isExpired && <span className="kanban-stale-badge" style={{ marginLeft: 6 }}>Po platnosti</span>}
                  {q.pdfStale && <span className="kanban-stale-badge" style={{ marginLeft: 6 }}>PDF neaktuálne</span>}
                </td>
                <td className="num">{fmtMoney(q.totalGross || q.totalNet)}</td>
                <td>{fmtDate(q.issueDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
