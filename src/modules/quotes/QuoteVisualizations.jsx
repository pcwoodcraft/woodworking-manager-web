import { useRef, useState } from 'react'
import { apiCall } from '../../api/client'
import { useToast } from '../../components/Toast'
import AtelierThumb from '../../components/AtelierThumb'

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function QuoteVisualizations({ quoteId, quote, frozen, onUpdated }) {
  const toast = useToast()
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const ids = quote?.visualizationIds || []

  const upload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !quoteId) return
    if (file.size > 8 * 1024 * 1024) {
      toast('Obrázok je príliš veľký (max. 8 MB).', 'err')
      return
    }
    setBusy(true)
    try {
      await apiCall('uploadQuoteVisualization', {
        quoteId,
        imageBase64: await fileToBase64(file),
        mimeType: file.type || 'image/jpeg',
        fileName: file.name,
      })
      toast('Vizualizácia nahraná — pregenerujte PDF.')
      onUpdated?.()
    } catch (err) {
      toast(err.message, 'err')
    } finally {
      setBusy(false)
    }
  }

  const detach = async (fileId) => {
    if (!window.confirm('Odobrať vizualizáciu z ponuky? (Súbor ostane v galérii Ateliéru.)')) return
    setBusy(true)
    try {
      await apiCall('detachVisualizationFromQuote', { quoteId, fileId })
      toast('Vizualizácia odobratá z ponuky.')
      onUpdated?.()
    } catch (err) {
      toast(err.message, 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-head" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>
          Vizualizácie
          {ids.length > 0 && (
            <span className="badge" style={{ marginLeft: 8, fontSize: '0.75em', verticalAlign: 'middle' }}>
              {ids.length}
            </span>
          )}
        </h3>
        {!frozen && (
          <>
            <input ref={inputRef} type="file" accept="image/*" hidden onChange={upload} />
            <button type="button" className="btn btn-sm" disabled={busy} onClick={() => inputRef.current?.click()}>
              {busy ? 'Ukladá sa…' : (ids.length ? 'Nahrať ďalší' : 'Nahrať obrázok')}
            </button>
          </>
        )}
      </div>

      {ids.length === 0 ? (
        <p className="muted" style={{ margin: '12px 0 0' }}>Bez vizualizácie.</p>
      ) : (
        <div className="quote-viz-list" style={{ marginTop: 12 }}>
          {ids.map((fileId, idx) => (
            <details key={fileId} className="quote-viz-item" style={{ marginBottom: 8 }}>
              <summary style={{ cursor: 'pointer' }}>
                Vizualizácia {idx + 1}
                {!frozen && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    style={{ marginLeft: 8 }}
                    disabled={busy}
                    onClick={(ev) => { ev.preventDefault(); detach(fileId) }}
                  >
                    Odobrať
                  </button>
                )}
              </summary>
              <div style={{ marginTop: 8, maxWidth: 480 }}>
                <AtelierThumb fileId={fileId} />
              </div>
            </details>
          ))}
        </div>
      )}

      {quote?.pdfStale && ids.length > 0 && (
        <p className="muted" style={{ marginTop: 8, fontSize: '0.9em' }}>
          PDF je neaktuálne — po zmene vizualizácií ho pregenerujte.
        </p>
      )}

      <style>{`
        .quote-viz-list .atelier-thumb { width: 100%; max-height: 360px; object-fit: contain; border-radius: 6px; background: #eee; }
        .quote-viz-list .atelier-thumb.placeholder { min-height: 120px; display: flex; align-items: center; justify-content: center; }
      `}</style>
    </div>
  )
}
