import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Spinner, ErrorBox } from '../../components/ui'
import { fmtDate, fmtMoney } from '../../utils/format'
import { DEAL_PHASES, lostReasonLabel, phaseLabel } from './crmConstants'

function FunnelBar({ phase, count, maxCount, value }) {
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0
  return (
    <tr>
      <td>{phaseLabel(phase)}</td>
      <td className="num">{count}</td>
      <td className="num">{value ? fmtMoney(value) : '—'}</td>
      <td style={{ width: '40%' }}>
        <div style={{ background: 'var(--border)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
          <div style={{ width: pct + '%', height: '100%', background: 'var(--gold)', minWidth: count ? 4 : 0 }} />
        </div>
      </td>
    </tr>
  )
}

export default function CrmOverview() {
  const { can } = useAuth()
  const isAdmin = can('perm_admin')
  const [mineOnly, setMineOnly] = useState(false)
  const [state, setState] = useState({ loading: true, error: null })
  const [data, setData] = useState(null)

  const load = useCallback(async () => {
    setState({ loading: true, error: null })
    try {
      setData(await apiCall('getCrmDashboard', { mineOnly: mineOnly || undefined }))
      setState({ loading: false, error: null })
    } catch (e) {
      setState({ loading: false, error: e })
    }
  }, [mineOnly])

  useEffect(() => { load() }, [load])

  if (state.loading) return <Spinner label="Načítava sa…" />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  if (!data) return null

  const maxFunnel = Math.max(1, ...(data.funnel || []).map(f => f.count))

  return (
    <>
      <div className="pipeline-toolbar">
        <p className="muted" style={{ margin: 0 }}>
          CRM prehľad — pipeline, prehry a zákazníci bez kontaktu. Vyhrané tento mesiac = odovzdané zákazky.
        </p>
        {isAdmin && (
          <label className="switch-row pipeline-filter">
            <input type="checkbox" checked={mineOnly} onChange={e => setMineOnly(e.target.checked)} />
            Len moje
          </label>
        )}
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Otvorené dopyty</div>
          <div className="stat-value">{data.openDealsCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pipeline (obchodné fázy)</div>
          <div className="stat-value stat-value-sm">{fmtMoney(data.pipelineValue)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Vážený pipeline</div>
          <div className="stat-value stat-value-sm">{fmtMoney(data.weightedPipelineValue)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Bez kontaktu 30+ dní</div>
          <div className="stat-value">{data.inactiveCustomers30Count}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Vyhrané / prehrané (mesiac)</div>
          <div className="stat-value stat-value-sm">{data.wonThisMonth} / {data.lostThisMonth}</div>
        </div>
      </div>

      <div className="card">
        <h2>Lievik — otvorené dopyty</h2>
        <table className="table">
          <thead><tr><th>Fáza</th><th className="num">Počet</th><th className="num">Hodnota</th><th /></tr></thead>
          <tbody>
            {DEAL_PHASES.map(p => {
              const row = (data.funnel || []).find(f => f.phase === p.value) || { count: 0, value: 0 }
              return (
                <FunnelBar key={p.value} phase={p.value} count={row.count} maxCount={maxFunnel} value={row.value} />
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Dôvody prehier</h2>
        {!data.lostByReason?.length ? (
          <p className="muted">Zatiaľ žiadne prehrané dopyty v rozsahu.</p>
        ) : (
          <table className="table">
            <thead><tr><th>Dôvod</th><th className="num">Počet</th></tr></thead>
            <tbody>
              {data.lostByReason.map(r => (
                <tr key={r.reason}>
                  <td>{lostReasonLabel(r.reason)}</td>
                  <td className="num">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Zákazníci bez kontaktu 30+ dní</h2>
        {!data.inactiveCustomers30?.length ? (
          <p className="muted">Všetci zákazníci v rozsahu boli kontaktovaní v posledných 30 dňoch.</p>
        ) : (
          <>
            {data.inactiveCustomers30Count > data.inactiveCustomers30.length && (
              <p className="muted">Zobrazených {data.inactiveCustomers30.length} z {data.inactiveCustomers30Count}.</p>
            )}
            <table className="table table-click">
              <thead><tr><th>Zákazník</th><th>Posledný kontakt</th><th className="num">Dní</th></tr></thead>
              <tbody>
                {data.inactiveCustomers30.map(c => (
                  <tr key={c.id}>
                    <td><Link to={'/zakaznici/' + c.id}>{c.displayName}</Link></td>
                    <td>{fmtDate(c.effectiveContact)}</td>
                    <td className="num">{c.daysSinceContact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {isAdmin && !mineOnly && (
        <>
          <div className="card" style={data.orphanedCustomersCount > 0 ? { borderColor: 'var(--gold-soft)' } : undefined}>
            <h2>Osirelí zákazníci (bez obchodníka)</h2>
            <p className="muted">Zákazníci bez priradeného obchodníka a bez dopytu. Priraďte obchodníka v detaile zákazníka.</p>
            {!data.orphanedCustomers?.length ? (
              <p className="muted">Žiadni osirelí zákazníci.</p>
            ) : (
              <>
                {data.orphanedCustomersCount > data.orphanedCustomers.length && (
                  <p className="muted">Zobrazených {data.orphanedCustomers.length} z {data.orphanedCustomersCount}.</p>
                )}
                <table className="table">
                  <thead><tr><th>Zákazník</th><th>Posledný kontakt</th><th>V systéme od</th></tr></thead>
                  <tbody>
                    {data.orphanedCustomers.map(c => (
                      <tr key={c.id}>
                        <td>
                          <Link to={'/zakaznici/' + c.id}>{c.displayName}</Link>
                          <span className="kanban-stale-badge" style={{ marginLeft: 8 }}>Osirelý</span>
                        </td>
                        <td>{fmtDate(c.lastContact) || '—'}</td>
                        <td>{fmtDate(c.createdAt) || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>

          {data.byOwner?.length > 0 && (
            <div className="card">
              <h2>Výkon obchodníkov</h2>
              <table className="table">
                <thead><tr><th>Obchodník</th><th className="num">Otvorené dopyty</th><th className="num">Pipeline €</th></tr></thead>
                <tbody>
                  {data.byOwner.map(o => (
                    <tr key={o.ownerEmail}>
                      <td>{o.ownerName}</td>
                      <td className="num">{o.openDealsCount}</td>
                      <td className="num">{fmtMoney(o.pipelineValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  )
}
