export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '')
    reader.onerror = () => reject(reader.error || new Error('Súbor sa nepodarilo načítať.'))
    reader.readAsDataURL(file)
  })
}

export function newClientFileId() {
  return globalThis.crypto?.randomUUID?.() || (Date.now() + '-' + Math.random().toString(16).slice(2))
}
