import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Spinner, ErrorBox } from '../../components/ui'
import { fmtMoney, fmtPercent } from '../../utils/format'

function fmtHoursVar(h) {
  if (h == null) return '—'
  const sign = h > 0 ? '+' : ''
  return sign + h + ' h'
}

export default function PricingStats() {
  const { can } = useAuth()
  const allowed = can('perm_projects_read') && can('perm_costs_full')
  const [years, setYears] = useState(2)
  const [state, setState] = useState({ loading: true, error: null, data: null })

  const load = async () => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const data = await apiCall('getPricingStats', { years })
      setState({ loading: false, error: null, data })
    } catch (e) {
      setState({ loading: false, error: e, data: null })
    }
  }

  useEffect(() => { if (allowed) load() }, [years, allowed]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!allowed) {
    return (
      <div className="page">
        <h1>Štatistiky</h1>
        <p className="muted">Na zobrazenie štatistík potrebujete právo čítať projekty aj náklady.</p>
      </div>
    )
  }

  if (state.loading && !state.data) return <Spinner />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  const d = state.data

  return (
    <div className="page">
      <header className="page-head">
        <h1>Štatistiky cenenia</h1>
        <label className="field" style={{ marginBottom: 0 }}>
          <span className="muted">Roky</span>
          <select value={years} onChange={e => setYears(Number(e.target.value))}>
            <option value={1}>1 rok</option>
            <option value={2}>2 roky</option>
            <option value={3}>3 roky</option>
            <option value={5}>5 rokov</option>
          </select>
        </label>
      </header>

      <p className="muted" style={{ marginBottom: 16 }}>
        Len plne uhradené a odovzdané projekty ({d.yearRange.from}–{d.yearRange.to}, rok podľa poslednej úhrady).
      </p>

      {d.awaitingPaymentCount > 0 && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--gold-soft)' }}>
          <h2>Čaká na doplatok ({d.awaitingPaymentCount})</h2>
          <p className="muted">Tieto projekty nie sú v priemere marže — inkaso ešte nie je kompletné.</p>
          <table className="table">
            <thead>
              <tr><th>Projekt</th><th>Zákazník</th><th className="num">Uhradené</th><th className="num">Zostáva</th></tr>
            </thead>
            <tbody>
              {d.awaitingPayment.map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.customer}</td>
                  <td className="num">{fmtMoney(p.paidNet)}</td>
                  <td className="num budget-label-warn">{fmtMoney(p.remainingNet)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Projektov v priemere</div>
          <div className="stat-value">{d.eligibleCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Marža (%)</div>
          <div className="stat-value">{d.avgMarginPercent != null ? fmtPercent(d.avgMarginPercent) : '—'}</div>
          <div className="stat-sub">medián {d.medianMarginPercent != null ? fmtPercent(d.medianMarginPercent) : '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Marža (€)</div>
          <div className="stat-value">{d.avgMarginNet != null ? fmtMoney(d.avgMarginNet) : '—'}</div>
          <div className="stat-sub">medián {d.medianMarginNet != null ? fmtMoney(d.medianMarginNet) : '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Odchýlka hodín</div>
          <div className="stat-value">{d.avgHoursVariance != null ? fmtHoursVar(d.avgHoursVariance) : '—'}</div>
          <div className="stat-sub">
            {d.hoursEstimateNote || (d.withHoursEstimateCount + ' projektov s odhadom')}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Odchýlka materiálu</div>
          <div className="stat-value">{d.avgMaterialVariance != null ? fmtMoney(d.avgMaterialVariance) : '—'}</div>
        </div>
      </div>

      {d.productTypeBreakdownHidden ? (
        <p className="muted card" style={{ marginTop: 16 }}>
          Rozdelenie podľa typu produktu je skryté — vyplnených typov je len {fmtPercent(d.productTypeFillPercent)}.
          Doplňte typ produktu pri dopytoch (cieľ aspoň 30 %).
        </p>
      ) : d.productTypeBreakdown.length > 0 && (
        <section className="card" style={{ marginTop: 16 }}>
          <h2>Podľa typu produktu</h2>
          {d.productTypeBreakdown.map(row => (
            <details key={row.productType} style={{ marginBottom: 12 }}>
              <summary style={{ cursor: 'pointer', padding: '8px 0' }}>
                <strong>{row.productType === 'bez_typu' ? 'Bez typu' : row.productType}</strong>
                {' · '}{row.count} projektov
                {' · '}marža {row.avgMarginPercent != null ? fmtPercent(row.avgMarginPercent) : '—'}
                {' / '}{row.avgMarginNet != null ? fmtMoney(row.avgMarginNet) : '—'}
              </summary>
              <table className="table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Projekt</th>
                    <th className="num">Marža %</th>
                    <th className="num">Marža €</th>
                    <th className="num">Odch. hodín</th>
                    <th className="num">Odch. materiálu</th>
                  </tr>
                </thead>
                <tbody>
                  {(row.projects || []).map(p => (
                    <tr key={p.projectId}>
                      <td>
                        <Link to={'/projekty/' + p.projectId}>{p.name}</Link>
                        <div className="muted">{p.customer}</div>
                      </td>
                      <td className="num">{p.marginPercent != null ? fmtPercent(p.marginPercent) : '—'}</td>
                      <td className="num">{p.marginNet != null ? fmtMoney(p.marginNet) : '—'}</td>
                      <td className="num">{fmtHoursVar(p.hoursVariance)}</td>
                      <td className="num">{p.materialVariance != null ? fmtMoney(p.materialVariance) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          ))}
        </section>
      )}
    </div>
  )
}
