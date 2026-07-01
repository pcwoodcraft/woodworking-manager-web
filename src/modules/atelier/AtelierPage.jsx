import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { useToast } from '../../components/Toast'
import { Spinner, ErrorBox } from '../../components/ui'
import AtelierThumb from '../../components/AtelierThumb'
import AtelierLightbox from './AtelierLightbox'

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function formatSkDate(iso) {
  if (!iso) return ''
  const s = String(iso).substring(0, 10)
  const parts = s.split('-')
  if (parts.length !== 3) return s
  return parseInt(parts[2], 10) + '.' + parseInt(parts[1], 10) + '.' + parts[0]
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
  const [lightboxImg, setLightboxImg] = useState(null)
  const [galleryBusy, setGalleryBusy] = useState(false)
  const [filterQuality, setFilterQuality] = useState('')
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterAssign, setFilterAssign] = useState('')
  const [filterPeriod, setFilterPeriod] = useState('30')
  const [state, setState] = useState({ loading: true, error: null })

  const loadGallery = useCallback(async () => {
    const payload = { limit: 60 }
    if (filterQuality) payload.quality = filterQuality
    if (filterCustomer) payload.customerId = filterCustomer
    if (filterAssign === 'unassigned') payload.unassignedOnly = true
    if (filterAssign === 'assigned') payload.assignedOnly = true
    if (filterPeriod === '30') payload.days = 30
    else if (filterPeriod === 'month') payload.period = 'month'
    try {
      const data = await apiCall('getAtelierGallery', payload)
      setGallery(data.images || [])
      return data.images || []
    } catch (e) {
      toast(e.message, 'err')
      return []
    }
  }, [filterQuality, filterCustomer, filterAssign, filterPeriod, toast])

  useEffect(() => {
    Promise.all([
      apiCall('getCustomers'),
      apiCall('getAtelierPresets'),
      apiCall('getQuotes'),
    ])
      .then(([custs, pr, qts]) => {
        setCustomers(custs || [])
        setPresets(pr || [])
        setQuotes(qts || [])
        setState({ loading: false, error: null })
      })
      .catch(e => setState({ loading: false, error: e.message }))
  }, [])

  useEffect(() => {
    if (state.loading) return
    loadGallery()
  }, [state.loading, loadGallery])

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
    if (!baseImage && refs.length === 0) {
      toast('Nahrajte aspoň jeden podklad — výkres alebo fotografiu', 'err')
      return
    }
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
      const images = await loadGallery()
      const lastFileId = res.images?.[0]?.fileId
      if (lastFileId) {
        const found = images.find(i => i.fileId === lastFileId)
        if (found) setLightboxImg(found)
      }
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setGenerating(false)
    }
  }

  const attachToQuote = async (fileId) => {
    if (!attachQuoteId) { toast('Vyberte ponuku', 'err'); return }
    setGalleryBusy(true)
    try {
      await apiCall('attachVisualizationToQuote', { quoteId: attachQuoteId, fileId })
      toast('Obrázok priradený k ponuke')
      const images = await loadGallery()
      if (lightboxImg?.fileId === fileId) {
        const updated = images.find(i => i.fileId === fileId)
        if (updated) setLightboxImg(updated)
      }
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setGalleryBusy(false)
    }
  }

  const hideFromGallery = async (img) => {
    setGalleryBusy(true)
    try {
      await apiCall('deleteAtelierImage', { id: img.id, fileId: img.fileId })
      toast('Obrázok skrytý z galérie')
      setLightboxImg(null)
      await loadGallery()
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setGalleryBusy(false)
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
            <span>Podklad (výkres alebo fotografia) *</span>
            <input type="file" accept="image/*" onChange={onBaseFile} />
          </label>
          <label className="field">
            <span>Referenčné fotky (voliteľné, max 3)</span>
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

      <div className="card atelier-gallery-card">
        <div className="card-head atelier-gallery-head">
          <h3 style={{ margin: 0 }}>Galéria</h3>
          <p className="muted atelier-gallery-hint">
            Náhľad → kontrola → finálna → priradenie k ponuke → skryť nepotrebné náhľady (súbor ostane na Drive).
          </p>
        </div>

        <div className="atelier-filters form-grid">
          <label className="field">
            <span>Typ</span>
            <select value={filterQuality} onChange={e => setFilterQuality(e.target.value)}>
              <option value="">Všetko</option>
              <option value="preview">Náhľady</option>
              <option value="final">Finálne</option>
              <option value="upload">Nahraté</option>
            </select>
          </label>
          <label className="field">
            <span>Zákazník</span>
            <select value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)}>
              <option value="">Všetci</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.company}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Priradenie</span>
            <select value={filterAssign} onChange={e => setFilterAssign(e.target.value)}>
              <option value="">Všetko</option>
              <option value="unassigned">Nepriradené</option>
              <option value="assigned">Priradené</option>
            </select>
          </label>
          <label className="field">
            <span>Obdobie</span>
            <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}>
              <option value="30">Posledných 30 dní</option>
              <option value="month">Tento mesiac</option>
              <option value="all">Všetko</option>
            </select>
          </label>
          <label className="field span-2">
            <span>Priradiť k ponuke (rýchle priradenie z karty)</span>
            <select value={attachQuoteId} onChange={e => setAttachQuoteId(e.target.value)}>
              <option value="">—</option>
              {quotes.map(q => (
                <option key={q.id} value={q.id}>{q.quoteNumber} — {q.projectName}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="atelier-grid">
          {gallery.length === 0 ? (
            <p className="muted">V aktuálnom filtri nie sú žiadne obrázky.</p>
          ) : gallery.map(img => (
            <div key={img.id} className="atelier-card">
              <button
                type="button"
                className="atelier-card-thumb-btn"
                onClick={() => setLightboxImg(img)}
                aria-label="Otvoriť náhľad"
              >
                <AtelierThumb fileId={img.fileId} />
              </button>
              <div className="atelier-card-meta">
                <span className={'badge atelier-quality-' + (img.quality || 'preview')}>
                  {img.qualityLabel || '—'}
                </span>
                <span className="muted atelier-card-date">{formatSkDate(img.createdAt)}</span>
              </div>
              {img.attachedQuoteNumbers?.length > 0 && (
                <p className="atelier-card-quotes muted">
                  {img.attachedQuoteNumbers.map((num, i) => {
                    const q = img.attachedQuotes?.[i]
                    return q ? (
                      <span key={q.quoteId}>
                        {i > 0 && ', '}
                        <Link to={'/zakaznici/ponuky/' + q.quoteId}>{num}</Link>
                      </span>
                    ) : num
                  })}
                </p>
              )}
              <p className="muted atelier-card-prompt">{img.prompt?.substring(0, 60)}{(img.prompt?.length > 60) ? '…' : ''}</p>
              <button
                type="button"
                className="btn btn-sm"
                disabled={galleryBusy}
                onClick={() => attachToQuote(img.fileId)}
              >
                Priradiť k ponuke
              </button>
            </div>
          ))}
        </div>
      </div>

      {lightboxImg && (
        <AtelierLightbox
          img={lightboxImg}
          quotes={quotes}
          attachQuoteId={attachQuoteId}
          onAttachQuoteIdChange={setAttachQuoteId}
          onAttach={attachToQuote}
          onHide={hideFromGallery}
          onClose={() => setLightboxImg(null)}
          busy={galleryBusy}
        />
      )}
    </div>
  )
}
