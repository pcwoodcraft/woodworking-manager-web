import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../../components/Modal'
import AtelierThumb from '../../components/AtelierThumb'

function formatSkDate(iso) {
  if (!iso) return '—'
  const s = String(iso).substring(0, 10)
  const parts = s.split('-')
  if (parts.length !== 3) return s
  return parseInt(parts[2], 10) + '.' + parseInt(parts[1], 10) + '.' + parts[0]
}

function hideConfirmMessage(quality) {
  const q = String(quality || '')
  if (q === 'final') {
    return 'Skryť finálnu vizualizáciu z galérie? Súbor zostane na Google Drive — odstráni sa len zo zoznamu v Ateliéri.'
  }
  if (q === 'upload') {
    return 'Skryť nahratý obrázok z galérie? Súbor zostane na Drive.'
  }
  return 'Skryť tento náhľad z galérie? Súbor zostane na Drive.'
}

export default function AtelierLightbox({
  img,
  quotes,
  attachQuoteId,
  onAttachQuoteIdChange,
  onAttach,
  onHide,
  onClose,
  busy,
}) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!img) return null

  const qualityClass = 'atelier-quality-' + (img.quality || 'preview')

  return (
    <Modal
      title="Náhľad vizualizácie"
      wide
      onClose={onClose}
      footer={
        <div className="atelier-lightbox-foot">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Zavrieť</button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => {
              if (window.confirm(hideConfirmMessage(img.quality))) onHide?.(img)
            }}
          >
            Skryť z galérie
          </button>
        </div>
      }
    >
      <div className="atelier-lightbox">
        <div className="atelier-lightbox-preview">
          <AtelierThumb fileId={img.fileId} className="atelier-lightbox-img" />
        </div>
        <div className="atelier-lightbox-meta">
          <p>
            <span className={'badge ' + qualityClass}>{img.qualityLabel || '—'}</span>
            <span className="muted" style={{ marginLeft: 10 }}>{formatSkDate(img.createdAt)}</span>
          </p>
          {img.customerName && (
            <p><strong>Zákazník:</strong> {img.customerName}</p>
          )}
          <p><strong>Pokyn:</strong></p>
          <p className="atelier-lightbox-prompt">{img.prompt || '—'}</p>
          {(img.attachedQuotes?.length > 0) && (
            <p>
              <strong>Priradené ponuky:</strong>{' '}
              {img.attachedQuotes.map((q, i) => (
                <span key={q.quoteId}>
                  {i > 0 && ', '}
                  <Link to={'/zakaznici/ponuky/' + q.quoteId}>{q.quoteNumber}</Link>
                </span>
              ))}
            </p>
          )}
          {img.driveUrl && (
            <p>
              <a href={img.driveUrl} target="_blank" rel="noopener noreferrer">Otvoriť v Google Drive</a>
            </p>
          )}
          <div className="atelier-lightbox-attach">
            <label className="field">
              <span>Priradiť k ponuke</span>
              <select value={attachQuoteId} onChange={e => onAttachQuoteIdChange?.(e.target.value)}>
                <option value="">—</option>
                {quotes.map(q => (
                  <option key={q.id} value={q.id}>{q.quoteNumber} — {q.projectName}</option>
                ))}
              </select>
            </label>
            <button type="button" className="btn btn-sm" disabled={busy} onClick={() => onAttach?.(img.fileId)}>
              Priradiť
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
