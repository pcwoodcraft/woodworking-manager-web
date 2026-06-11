export default function Modal({ title, onClose, children, footer, wide = false }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className={'modal' + (wide ? ' modal-wide' : '')} onMouseDown={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="modal-x" onClick={onClose} aria-label="Zavrieť">×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}
