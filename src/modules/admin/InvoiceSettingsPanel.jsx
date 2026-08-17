import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../components/Toast'
import { ErrorBox } from '../../components/ui'
import {
  INVOICE_FIELDS,
  INVOICE_SETTING_KEYS,
  canLoadInvoiceSettings,
  projectInvoiceSettings,
  requireSettingsProjection,
} from './invoiceSettingsFields'

export default function InvoiceSettingsPanel({ moduleEnabled, canRead }) {
  const toast = useToast()
  const { instanceConfiguration, refreshInstanceConfiguration, invalidateInstanceConfiguration } = useAuth()
  const access = canLoadInvoiceSettings({ moduleEnabled, canRead })
  const [loading, setLoading] = useState(access)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [settings, setSettings] = useState(projectInvoiceSettings())
  const [nextRegular, setNextRegular] = useState('')
  const [nextAdvance, setNextAdvance] = useState('')
  const mutationRef = useRef(false)

  const load = useCallback(async () => {
    if (!canLoadInvoiceSettings({ moduleEnabled, canRead })) return false
    setLoading(true)
    setError(null)
    try {
      const data = await apiCall('getInvoiceSettings')
      setSettings(requireSettingsProjection(data?.settings, INVOICE_SETTING_KEYS))
      setNextRegular(data?.nextRegularPreview || data?.nextNumberPreview || '')
      setNextAdvance(data?.nextAdvancePreview || '')
      return true
    } catch (loadError) {
      setError(loadError)
      return false
    } finally {
      setLoading(false)
    }
  }, [moduleEnabled, canRead])

  useEffect(() => { if (access) load() }, [access, load])

  const invoiceIssues = useMemo(() => (instanceConfiguration?.invoicing?.issues || [])
    .filter(issue => INVOICE_SETTING_KEYS.includes(issue.key)), [instanceConfiguration])
  const issueByKey = useMemo(() => Object.fromEntries(invoiceIssues.map(issue => [issue.key, issue.kind])), [invoiceIssues])
  const invoiceReady = instanceConfiguration?.state === 'loaded' && invoiceIssues.length === 0

  const set = (key) => (event) => setSettings(current => ({ ...current, [key]: event.target.value }))

  const save = async () => {
    if (mutationRef.current) return
    mutationRef.current = true
    setSaving(true)
    try {
      const data = await apiCall('saveInvoiceSettings', { settings: projectInvoiceSettings(settings) })
      let savedSettings
      try {
        savedSettings = requireSettingsProjection(data?.settings, INVOICE_SETTING_KEYS)
      } catch {
        invalidateInstanceConfiguration()
        toast('Nastavenia boli uložené, ale server nevrátil overiteľný aktuálny stav. Obnovte stránku.', 'err')
        return
      }
      setSettings(savedSettings)
      setNextRegular(data?.nextRegularPreview || '')
      setNextAdvance(data?.nextAdvancePreview || '')
      const status = await refreshInstanceConfiguration()
      if (status.state === 'loaded') toast('Nastavenia fakturácie uložené')
      else toast('Nastavenia boli uložené, ale aktuálny stav sa nepodarilo overiť. Obnovte stránku.', 'err')
    } catch (saveError) {
      if (saveError?.code !== 'UNAUTHORIZED') toast('Nepodarilo sa uložiť: ' + saveError.message, 'err')
    } finally {
      setSaving(false)
      mutationRef.current = false
    }
  }

  const sync = async () => {
    if (mutationRef.current) return
    if (!window.confirm('Nastaviť ďalšie čísla podľa existujúcich dokladov (rady F, Z a D zvlášť)?')) return
    mutationRef.current = true
    setSyncing(true)
    try {
      await apiCall('syncInvoiceSequence')
      const loaded = await load()
      const status = await refreshInstanceConfiguration()
      if (loaded && status.state === 'loaded') toast('Rady F/Z/D boli synchronizované')
      else toast('Rady boli synchronizované, ale aktuálny stav sa nepodarilo načítať. Obnovte stránku.', 'err')
    } catch (syncError) {
      if (syncError?.code !== 'UNAUTHORIZED') toast('Synchronizácia zlyhala: ' + syncError.message, 'err')
    } finally {
      setSyncing(false)
      mutationRef.current = false
    }
  }

  if (!moduleEnabled) return <p className="muted">Modul Fakturácia je vypnutý. Nastavenia sa sprístupnia po jeho aktivácii.</p>
  if (!canRead) return <p className="muted">Na zobrazenie fakturačných nastavení nemáte oprávnenie.</p>
  if (loading) return <p className="muted">Načítava sa…</p>
  if (error) return <ErrorBox error={error} onRetry={load} />

  return (
    <div>
      {instanceConfiguration?.state === 'unavailable' ? (
        <p className="configuration-summary configuration-summary-error" role="alert">Aktuálny stav fakturačnej konfigurácie sa nepodarilo overiť.</p>
      ) : (
        <p className={'configuration-summary ' + (invoiceReady ? 'configuration-summary-ok' : 'configuration-summary-error')}
          role={invoiceReady ? undefined : 'alert'}>
          {invoiceReady ? 'Fakturačné údaje sú pripravené.' : 'Fakturačné údaje vyžadujú opravu.'}
        </p>
      )}
      <p className="muted" style={{ marginBottom: 12 }}>
        Ostré faktúry: rad <b>F</b>. Zálohy: rad <b>Z</b>. Storná a dobropisy: rad <b>D</b>.
        Ďalšie číslo F: <b>{nextRegular || '—'}</b> · Z: <b>{nextAdvance || '—'}</b> · D: <b>{settings.creditNoteNextSeq || '—'}</b>
      </p>
      <div className="form-grid">
        {INVOICE_FIELDS.map(field => {
          const issue = issueByKey[field.key]
          return (
            <label key={field.key} className={'field' + (field.span === 2 ? ' span-2' : '') + (issue ? ' field-error' : '')}>
              <span>{field.label}</span>
              {field.rows ? (
                <textarea rows={field.rows} value={settings[field.key] ?? ''} onChange={set(field.key)} />
              ) : (
                <input value={settings[field.key] ?? ''} onChange={set(field.key)} />
              )}
              {issue && <small>{issue === 'missing' ? 'Povinné pole chýba.' : 'Hodnota nie je platná.'}</small>}
            </label>
          )
        })}
      </div>
      <div className="btn-group" style={{ marginTop: 16 }}>
        <button className="btn" onClick={save} disabled={saving || syncing}>{saving ? 'Ukladá sa…' : 'Uložiť nastavenia'}</button>
        <button className="btn btn-secondary" onClick={sync} disabled={saving || syncing}>{syncing ? '…' : 'Synchronizovať rady F/Z/D'}</button>
      </div>
    </div>
  )
}
