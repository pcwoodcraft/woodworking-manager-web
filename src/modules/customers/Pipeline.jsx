import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Spinner, ErrorBox } from '../../components/ui'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import { fmtMoney, parseNum } from '../../utils/format'
import {
  DEAL_PHASES, KANBAN_COLUMNS, LOST_REASONS, STALE_DAYS,
  sourceLabel,
} from './crmConstants'
import LostReasonModal from './LostReasonModal'

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
    </div>
  )
}

function DealEditModal({ deal, onClose, onSaved }) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    phase: deal.phase || 'novy_dopyt',
    status: deal.status || 'otvoreny',
    lostReason: deal.lostReason || 'cena',
    lostReasonOther: deal.lostReasonOther || '',
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const movePhase = async () => {
    setSaving(true)
    try {
      const res = await apiCall('moveDealPhase', { id: deal.id, phase: f.phase })
      if (res.warning) toast(res.warning)
      toast('Fáza uložená')
      onSaved()
    } catch (e) {
      toast(e.message, 'err')
      setSaving(false)
    }
  }

  const markWon = async () => {
    setSaving(true)
    try {
      await apiCall('moveDealPhase', { id: deal.id, status: 'vyhrate', phase: f.phase })
      toast('Dopyt označený ako vyhraný')
      onSaved()
    } catch (e) {
      toast(e.message, 'err')
      setSaving(false)
    }
  }

  const markLost = async () => {
    if (f.status !== 'prehrate' && !f.lostReason) {
      toast('Vyberte dôvod prehry', 'err'); return
    }
    setSaving(true)
    try {
      await apiCall('moveDealPhase', {
        id: deal.id,
        status: 'prehrate',
        lostReason: f.lostReason,
        lostReasonOther: f.lostReasonOther,
      })
      toast('Dopyt označený ako prehraný')
      onSaved()
    } catch (e) {
      toast(e.message, 'err')
      setSaving(false)
    }
  }

  return (
    <Modal title={deal.title || deal.id} onClose={onClose} wide
      footer={<button className="btn btn-secondary" onClick={onClose}>Zavrieť</button>}>
      <p className="muted" style={{ marginBottom: 12 }}>
        <Link to={'/zakaznici/' + deal.customerId}>{deal.customerName}</Link>
        {' · '}{deal.id}
      </p>
      <div className="form-grid">
        <label className="field"><span>Fáza</span>
          <select value={f.phase} onChange={set('phase')}>
            {DEAL_PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
        <label className="field"><span>Zdroj</span>
          <input disabled value={sourceLabel(deal.source)} />
        </label>
        <label className="field"><span>Hodnota</span>
          <input disabled value={deal.estimatedValue ? fmtMoney(deal.estimatedValue) : '—'} />
        </label>
        <label className="field"><span>Vážená hodnota</span>
          <input disabled value={deal.weightedValue ? fmtMoney(deal.weightedValue) : '—'} />
        </label>
      </div>
      <div className="btn-group" style={{ marginTop: 16 }}>
        <button className="btn btn-sm" onClick={movePhase} disabled={saving}>Uložiť fázu</button>
        <button className="btn btn-sm btn-secondary" onClick={markWon} disabled={saving}>Vyhrané</button>
        <button className="btn btn-sm btn-secondary" onClick={markLost} disabled={saving}>Prehrané</button>
      </div>
      {f.status === 'prehrate' || (
        <div className="form-grid" style={{ marginTop: 14 }}>
          <label className="field span-2"><span>Dôvod prehry (pri Prehrané)</span>
            <select value={f.lostReason} onChange={set('lostReason')}>
              {LOST_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </label>
        </div>
      )}
    </Modal>
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
        <DealEditModal
          deal={editDeal}
          onClose={() => setEditDeal(null)}
          onSaved={() => { setEditDeal(null); load() }}
        />
      )}
    </>
  )
}
