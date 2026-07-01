import { useEffect, useState } from 'react'
import { apiCall } from '../api/client'

export default function AtelierThumb({ fileId, className }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    if (!fileId) return
    let cancelled = false
    apiCall('getAtelierImagePreview', { fileId })
      .then(d => {
        if (!cancelled) setSrc('data:' + d.mimeType + ';base64,' + d.dataBase64)
      })
      .catch(() => { if (!cancelled) setSrc('') })
    return () => { cancelled = true }
  }, [fileId])
  if (!src) return <div className={'atelier-thumb placeholder' + (className ? ' ' + className : '')}>…</div>
  return <img src={src} alt="" className={'atelier-thumb' + (className ? ' ' + className : '')} />
}
