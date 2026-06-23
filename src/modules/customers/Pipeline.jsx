import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Spinner, ErrorBox } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { fmtMoney, parseNum } from '../../utils/format'
import { KANBAN_COLUMNS, STALE_DAYS } from './crmConstants'
import LostReasonModal from './LostReasonModal'
import DealDetailModal from './DealDetailModal'

function dealColumn(deal) {
  if (deal.status === 'vyhrate') return { kind: 'status', value: 'vyhrate' }
  if (deal.status === 'prehrate') return { kind: 'status', value: 'prehrate' }
  return { kind: 'phase', value: deal.phase || 'novy_dopyt' }
}

function columnKey(col) {
  return col.kind + ':' + col.value
}

function DealCard({ deal, onDragStart, onClick }) {
  return (
    <div
      className={'kanban-card' + (deal.stale ? ' kanban-card-stale' : '')}
      draggable
      onDragStart={e => onDragStart(e, deal.id)}
      onClick={() => onClick(deal)}
    >
      <div className="kanban-card-title">{deal.title || deal.id}</div>
      <div className="kanban-card-sub">{deal.customerName}</div>
      {deal.estimatedValue ? (
        <div className="kanban-card-value">{fmtMoney(deal.estimatedValue)}</div>
      ) : null}
      {deal.weightedValue > 0 && (
        <div className="kanban-card-weight muted">Vážené: {fmtMoney(deal.weightedValue)}</div>
      )}
      {deal.stale && <div className="kanban-stale-badge">Bez aktivity {deal.daysSinceActivity}+ dní</div>}
      {deal.owner && <div className="kanban-card-owner">{deal.owner}</div>}
      {deal.projectId && <div className="kanban-card-sub">Projekt: {deal.projectId}</div>}
    </div>
  )
}

export default function Pipeline() {
  const toast = useToast()
  const { can } = useAuth()
  const isAdmin = can('perm_admin')
  const [mineOnly, setMineOnly] = useState(false)
  const [state, setState] = useState({ loading: true, error: null })
  const [deals, setDeals] = useState([])
  const [dragId, setDragId] = useState(null)
  const [pendingLost, setPendingLost] = useState(null)
  const [editDeal, setEditDeal] = useState(null)
  const [moving, setMoving] = useState(false)

  const load = useCallback(async () => {
    setState({ loading: true, error: null })
    try {
      const rows = await apiCall('getDeals', { mineOnly: mineOnly || undefined, staleDays: STALE_DAYS })
      setDeals(rows)
      setState({ loading: false, error: null })
    } catch (e) {
      setState({ loading: false, error: e })
    }
  }, [mineOnly])

  useEffect(() => { load() }, [load])

  const summary = useMemo(() => {
    const open = deals.filter(d => d.status === 'otvoreny')
    const total = open.reduce((s, d) => s + parseNum(d.estimatedValue), 0)
    const weighted = open.reduce((s, d) => s + parseNum(d.weightedValue), 0)
    return { open: open.length, total, weighted, stale: open.filter(d => d.stale).length }
  }, [deals])

  const byColumn = useMemo(() => {
    const map = new Map()
    KANBAN_COLUMNS.forEach(col => map.set(columnKey(col), []))
    deals.forEach(deal => {
      const col = dealColumn(deal)
      const key = columnKey(col)
      if (map.has(key)) map.get(key).push(deal)
    })
    return map
  }, [deals])

  const onDragStart = (e, id) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const applyMove = async (dealId, col, lost) => {
    setMoving(true)
    try {
      let payload = { id: dealId }
      if (col.kind === 'status') {
        payload.status = col.value
        if (col.value === 'prehrate') {
          payload.lostReason = lost.lostReason
          payload.lostReasonOther = lost.lostReasonOther || ''
        }
      } else {
        payload.phase = col.value
      }
      const res = await apiCall('moveDealPhase', payload)
      if (res.warning) toast(res.warning)
      toast('Dopyt presunutý')
      setPendingLost(null)
      if (res.deal) {
        setDeals(prev => prev.map(d => String(d.id) === String(dealId) ? res.deal : d))
      } else {
        load()
      }
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setMoving(false)
      setDragId(null)
    }
  }

  const onDrop = (e, col) => {
    e.preventDefault()
    const dealId = dragId || e.dataTransfer.getData('text/plain')
    if (!dealId) return
    if (col.kind === 'status' && col.value === 'prehrate') {
      setPendingLost({ dealId, col })
      return
    }
    applyMove(dealId, col, null)
  }

  if (state.loading) return <Spinner />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  return (
    <>
      <div className="pipeline-toolbar">
        <div className="stat-grid" style={{ marginBottom: 0, flex: 1 }}>
          <div className="stat-card">
            <div className="stat-label">Otvorené dopyty</div>
            <div className="stat-value stat-value-sm">{summary.open}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Hodnota pipeline</div>
            <div className="stat-value stat-value-sm">{fmtMoney(summary.total)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Vážená hodnota</div>
            <div className="stat-value stat-value-sm">{fmtMoney(summary.weighted)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Bez aktivity {STALE_DAYS}+ dní</div>
            <div className={'stat-value stat-value-sm' + (summary.stale ? ' budget-label-warn' : '')}>{summary.stale}</div>
          </div>
        </div>
        {isAdmin && (
          <label className="switch-row pipeline-filter">
            <input type="checkbox" checked={mineOnly} onChange={e => setMineOnly(e.target.checked)} />
            Len moje dopyty
          </label>
        )}
      </div>

      <p className="muted" style={{ marginBottom: 12 }}>
        Ťahajte karty medzi stĺpcami. Kliknutím upravíte fázu alebo stav. Pri prehre vyplníte dôvod.
      </p>

      <div className="kanban-board">
        {KANBAN_COLUMNS.map(col => {
          const items = byColumn.get(columnKey(col)) || []
          const isEnd = col.kind === 'status'
          return (
            <div
              key={columnKey(col)}
              className={'kanban-col' + (isEnd ? ' kanban-col-end kanban-col-' + col.value : '')}
              onDragOver={e => e.preventDefault()}
              onDrop={e => onDrop(e, col)}
            >
              <div className="kanban-col-head">
                <span>{col.label}</span>
                <span className="kanban-count">{items.length}</span>
              </div>
              <div className="kanban-col-body">
                {items.map(deal => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    onDragStart={onDragStart}
                    onClick={setEditDeal}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {pendingLost && (
        <LostReasonModal
          saving={moving}
          onClose={() => { setPendingLost(null); setDragId(null) }}
          onConfirm={lost => applyMove(pendingLost.dealId, pendingLost.col, lost)}
        />
      )}

      {editDeal && (
        <DealDetailModal
          dealId={editDeal.id}
          onClose={() => setEditDeal(null)}
          onUpdated={load}
        />
      )}
    </>
  )
}
