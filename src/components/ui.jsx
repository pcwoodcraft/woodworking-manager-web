// Drobné zdieľané komponenty: spinner, chybová hláška, badge stavu projektu

import { statusLabel, normalizeStatus } from '../utils/format'

export function Spinner({ label = 'Načítava sa…' }) {
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  )
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="error-box">
      <p>Nepodarilo sa načítať dáta. Skúste znova.</p>
      {error && <p className="error-detail">{String(error.message || error)}</p>}
      {onRetry && <button className="btn" onClick={onRetry}>Skúsiť znova</button>}
    </div>
  )
}

export function StatusBadge({ status }) {
  const norm = normalizeStatus(status)
  return <span className={'badge badge-' + norm}>{statusLabel(status)}</span>
}
