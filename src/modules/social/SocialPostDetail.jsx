import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { Spinner, ErrorBox } from '../../components/ui'
import { useToast } from '../../components/Toast'

export default function SocialPostDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)
  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [photoIds, setPhotoIds] = useState([])
  const [busy, setBusy] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const d = await apiCall('getSocialPostDetail', { id })
      setDetail(d)
      setCaption(d.post.captionText || '')
      setHashtags((d.hashtagsList || []).join(', '))
      setScheduledTime(d.post.scheduledTime || '')
      setPhotoIds(d.photos.map(p => p.id))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveDraft = async () => {
    setBusy('save')
    try {
      await apiCall('saveSocialPostDraft', {
        id,
        captionText: caption,
        hashtags: hashtags.split(',').map(s => s.trim()).filter(Boolean),
        photoIds,
        scheduledTime
      })
      toast('Uložené')
      load()
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setBusy('')
    }
  }

  const act = async (action, label) => {
    setBusy(action)
    try {
      await apiCall(action, { id })
      toast(label)
      if (action === 'rejectSocialPost') navigate('/socialne-siete')
      else load()
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setBusy('')
    }
  }

  if (loading) return <Spinner label="Načítavam…" />
  if (error) return <ErrorBox message={error} onRetry={load} />
  if (!detail) return null

  const st = detail.post.status
  const isGenerated = st === 'generated'
  const isFailed = st === 'failed'
  const isSendError = st === 'approved' && detail.post.error

  const removePhoto = (phId) => setPhotoIds(prev => prev.filter(x => x !== phId))

  return (
    <div className="page">
      <header className="page-head">
        <button className="btn btn-ghost" onClick={() => navigate('/socialne-siete')}>← Späť</button>
        <h1>{detail.projectName} — {st}</h1>
      </header>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="photo-grid">
          {detail.photos.filter(p => photoIds.includes(p.id)).map(p => (
            <div key={p.id} className="photo-thumb">
              {p.thumbnailUrl ? <img src={p.thumbnailUrl} alt="" /> : <span>?</span>}
              {isGenerated && (
                <button type="button" className="btn-icon" onClick={() => removePhoto(p.id)} title="Odobrať">×</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {(isGenerated || isFailed) && (
        <>
          <div className="card form-grid" style={{ marginBottom: 16 }}>
            <label className="field span-2"><span>Text príspevku</span>
              <textarea rows={6} value={caption} onChange={e => setCaption(e.target.value)} disabled={!isGenerated} />
            </label>
            <label className="field span-2"><span>Hashtagy (čiarkou)</span>
              <input value={hashtags} onChange={e => setHashtags(e.target.value)} disabled={!isGenerated} />
            </label>
            {isGenerated && (
              <label className="field span-2"><span>Čas publikácie (ISO, voliteľné)</span>
                <input value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} placeholder="prázdne = default prac. deň 10:00" />
              </label>
            )}
          </div>

          <div className="btn-row">
            {isGenerated && (
              <>
                <button className="btn" disabled={!!busy} onClick={() => act('approveSocialPost', 'Schválené a naplánované')}>
                  Schváliť a naplánovať
                </button>
                <button className="btn btn-secondary" disabled={!!busy} onClick={saveDraft}>Uložiť úpravy</button>
                <button className="btn btn-secondary" disabled={!!busy} onClick={() => act('regenerateSocialPost', 'Pregenerovanie spustené')}>
                  Pregenerovať
                </button>
                <button className="btn btn-danger" disabled={!!busy} onClick={() => act('rejectSocialPost', 'Zamietnuté')}>
                  Zamietnuť
                </button>
              </>
            )}
            {isFailed && (
              <>
                <button className="btn" disabled={!!busy} onClick={() => act('regenerateSocialPost', 'Pregenerovanie spustené')}>
                  Pregenerovať
                </button>
                <button className="btn btn-danger" disabled={!!busy} onClick={() => act('rejectSocialPost', 'Zamietnuté')}>
                  Zamietnuť
                </button>
              </>
            )}
          </div>
        </>
      )}

      {isSendError && (
        <div className="card">
          <p className="err-text">{detail.post.error}</p>
          <button className="btn" disabled={!!busy} onClick={() => act('retrySocialPostBuffer', 'Opakovanie odoslania…')}>
            Skúsiť znova
          </button>
        </div>
      )}
    </div>
  )
}
