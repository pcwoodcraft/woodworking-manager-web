import { useEffect, useState } from 'react'
import { apiCall } from '../../api/client'
import { useToast } from '../../components/Toast'
import { Spinner, ErrorBox } from '../../components/ui'

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function AtelierThumb({ fileId }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    if (!fileId) return
    apiCall('getAtelierImagePreview', { fileId })
      .then(d => setSrc('data:' + d.mimeType + ';base64,' + d.dataBase64))
      .catch(() => setSrc(''))
  }, [fileId])
  if (!src) return <div className="atelier-thumb placeholder">…</div>
  return <img src={src} alt="" className="atelier-thumb" />
}

export default function AtelierPage() {
  const toast = useToast()
  const [prompt, setPrompt] = useState('')
  const [quality, setQuality] = useState('preview')
  const [customerId, setCustomerId] = useState('')
  const [customers, setCustomers] = useState([])
  const [presets, setPresets] = useState([])
  const [baseImage, setBaseImage] = useState('')
  const [baseMime, setBaseMime] = useState('image/png')
  const [refs, setRefs] = useState([])
  const [generating, setGenerating] = useState(false)
  const [gallery, setGallery] = useState([])
  const [quotes, setQuotes] = useState([])
  const [attachQuoteId, setAttachQuoteId] = useState('')
  const [state, setState] = useState({ loading: true, error: null })

  const loadGallery = async () => {
    try {
      const data = await apiCall('getAtelierGallery', { limit: 40 })
      setGallery(data.images || [])
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  useEffect(() => {
    Promise.all([
      apiCall('getCustomers'),
      apiCall('getAtelierPresets'),
      apiCall('getQuotes'),
      loadGallery(),
    ])
      .then(([custs, pr, qts]) => {
        setCustomers(custs || [])
        setPresets(pr || [])
        setQuotes(qts || [])
        setState({ loading: false, error: null })
      })
      .catch(e => setState({ loading: false, error: e.message }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onBaseFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBaseMime(file.type || 'image/png')
    setBaseImage(await fileToBase64(file))
  }

  const onRefFiles = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 3)
    const out = []
    for (const file of files) {
      out.push({ base64: await fileToBase64(file), mimeType: file.type || 'image/jpeg' })
    }
    setRefs(out)
  }

  const generate = async () => {
    if (!prompt.trim()) { toast('Zadajte pokyn', 'err'); return }
    if (!baseImage) { toast('Nahrajte podklad (výkres)', 'err'); return }
    setGenerating(true)
    try {
      const res = await apiCall('generateVisualization', {
        prompt: prompt.trim(),
        quality,
        customerId,
        baseImage,
        baseMimeType: baseMime,
        references: refs,
      })
      toast('Vygenerované: ' + (res.images?.length || 0) + ' návrh(ov)')
      await loadGallery()
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setGenerating(false)
    }
  }

  const attachToQuote = async (fileId) => {
    if (!attachQuoteId) { toast('Vyberte ponuku', 'err'); return }
    try {
      await apiCall('attachVisualizationToQuote', { quoteId: attachQuoteId, fileId })
      toast('Obrázok priradený k ponuke')
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  const savePreset = async () => {
    if (!prompt.trim()) { toast('Zadajte pokyn', 'err'); return }
    const name = window.prompt('Názov predvoľby:')
    if (!name) return
    try {
      await apiCall('saveAtelierPreset', { preset: { name, prompt: prompt.trim() } })
      toast('Predvoľba uložená')
      const pr = await apiCall('getAtelierPresets')
      setPresets(pr || [])
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  if (state.loading) return <div className="page"><Spinner label="Načítava sa…" /></div>
  if (state.error) return <div className="page"><ErrorBox message={state.error} /></div>

  return (
    <div className="page page-wide">
      <header className="page-head">
        <h1>Vizualizačný ateliér</h1>
        <p className="muted">Ilustračné náhľady — finálna kvalita môže trvať dlhšie. Obrázky sa ukladajú na Drive.</p>
      </header>

      <div className="card">
        <div className="form-grid">
          <label className="field span-2">
            <span>Pokyn (materiál, štýl, povrch…)</span>
            <textarea rows={3} value={prompt} onChange={e => setPrompt(e.target.value)} />
          </label>
          <label className="field">
            <span>Predvoľba</span>
            <select value="" onChange={e => { if (e.target.value) setPrompt(e.target.value) }}>
              <option value="">—</option>
              {presets.map(p => <option key={p.id} value={p.prompt}>{p.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Kvalita</span>
            <select value={quality} onChange={e => setQuality(e.target.value)}>
              <option value="preview">Rýchly náhľad</option>
              <option value="final">Finálna kvalita</option>
            </select>
          </label>
          <label className="field span-2">
            <span>Zákazník (voliteľné)</span>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)}>
              <option value="">—</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.company}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Podklad (výkres) *</span>
            <input type="file" accept="image/*" onChange={onBaseFile} />
          </label>
          <label className="field">
            <span>Referenčné fotky (max 3)</span>
            <input type="file" accept="image/*" multiple onChange={onRefFiles} />
          </label>
        </div>
        <div className="btn-group" style={{ marginTop: 12 }}>
          <button type="button" className="btn" onClick={generate} disabled={generating}>
            {generating ? 'Generuje sa…' : 'Generovať'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={savePreset}>Uložiť predvoľbu pokynu</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-head">
          <h3 style={{ margin: 0 }}>Galéria</h3>
          <label className="field" style={{ margin: 0 }}>
            <span className="muted">Priradiť k ponuke</span>
            <select value={attachQuoteId} onChange={e => setAttachQuoteId(e.target.value)}>
              <option value="">—</option>
              {quotes.map(q => (
                <option key={q.id} value={q.id}>{q.quoteNumber} — {q.projectName}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="atelier-grid">
          {gallery.length === 0 ? <p className="muted">Zatiaľ žiadne obrázky.</p> : gallery.map(img => (
            <div key={img.id} className="atelier-card">
              <AtelierThumb fileId={img.fileId} />
              <p className="muted" style={{ fontSize: '0.85em' }}>{img.prompt?.substring(0, 60)}</p>
              <button type="button" className="btn btn-sm" onClick={() => attachToQuote(img.fileId)}>Priradiť k ponuke</button>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .atelier-grid { display: flex; flex-wrap: wrap; gap: 16px; }
        .atelier-card { width: 200px; }
        .atelier-thumb { width: 100%; height: 140px; object-fit: cover; border-radius: 6px; background: #eee; }
        .atelier-thumb.placeholder { display: flex; align-items: center; justify-content: center; }
      `}</style>
    </div>
  )
}
