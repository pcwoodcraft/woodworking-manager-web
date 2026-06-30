import { useEffect, useState } from 'react'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Spinner, ErrorBox } from '../../components/ui'
import { fmtMoney, fmtPercent } from '../../utils/format'

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
          <div className="stat-label">Priemerná marža</div>
          <div className="stat-value">{d.avgMarginPercent != null ? fmtPercent(d.avgMarginPercent) : '—'}</div>
          <div className="stat-sub">medián {d.medianMarginPercent != null ? fmtPercent(d.medianMarginPercent) : '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Odchýlka hodín</div>
          <div className="stat-value">
            {d.avgHoursVariancePercent != null ? fmtPercent(d.avgHoursVariancePercent) : '—'}
          </div>
          <div className="stat-sub">
            {d.hoursEstimateNote || (d.withHoursEstimateCount + ' projektov s odhadom')}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Odchýlka materiálu (priemer)</div>
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
          <table className="table">
            <thead>
              <tr>
                <th>Typ</th><th className="num">Počet</th>
                <th className="num">Priem. marža</th><th className="num">Priem. odchýlka hodín</th>
              </tr>
            </thead>
            <tbody>
              {d.productTypeBreakdown.map(row => (
                <tr key={row.productType}>
                  <td>{row.productType === 'bez_typu' ? 'Bez typu' : row.productType}</td>
                  <td className="num">{row.count}</td>
                  <td className="num">{row.avgMarginPercent != null ? fmtPercent(row.avgMarginPercent) : '—'}</td>
                  <td className="num">{row.avgHoursVariancePercent != null ? fmtPercent(row.avgHoursVariancePercent) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
