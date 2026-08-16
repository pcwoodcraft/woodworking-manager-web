import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { ErrorBox } from '../../components/ui'
import { useToast } from '../../components/Toast'

const projectTaxSettings = (raw = {}) => ({
  companyTaxRegime: raw?.companyTaxRegime ?? '',
  vatRate: raw?.vatRate ?? '',
})

export default function TaxSettingsPanel() {
  const toast = useToast()
  const {
    instanceConfiguration,
    refreshBootstrap,
    refreshInstanceConfiguration,
    invalidateInstanceConfiguration,
  } = useAuth()
  const [settings, setSettings] = useState(projectTaxSettings())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiCall('getTaxSettings')
      setSettings(projectTaxSettings(data?.settings))
    } catch (loadError) {
      setError(loadError)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const issueByKey = useMemo(() => Object.fromEntries(
    (instanceConfiguration?.tax?.issues || []).map(issue => [issue.key, issue.kind])
  ), [instanceConfiguration])

  const set = (key) => (event) => setSettings(current => ({ ...current, [key]: event.target.value }))

  const save = async () => {
    setSaving(true)
    try {
      const data = await apiCall('saveTaxSettings', { settings: projectTaxSettings(settings) })
      setSettings(projectTaxSettings(data?.settings))
      try {
        await refreshBootstrap()
        const status = await refreshInstanceConfiguration()
        if (status.state !== 'loaded') {
          toast('Nastavenia boli uložené, ale aktuálny stav sa nepodarilo overiť. Obnovte stránku.', 'err')
        } else {
          toast('Daňové nastavenia uložené')
        }
      } catch (refreshError) {
        if (refreshError?.code === 'UNAUTHORIZED') return
        invalidateInstanceConfiguration()
        toast('Nastavenia boli uložené, ale aktuálny stav sa nepodarilo overiť. Obnovte stránku.', 'err')
      }
    } catch (saveError) {
      if (saveError?.code !== 'UNAUTHORIZED') toast('Nepodarilo sa uložiť: ' + saveError.message, 'err')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="muted">Načítava sa…</p>
  if (error) return <ErrorBox error={error} onRetry={load} />

  return (
    <div>
      {instanceConfiguration?.state === 'unavailable' && (
        <p className="configuration-summary configuration-summary-error" role="alert">
          Aktuálny stav konfigurácie sa nepodarilo overiť. Formulár môžete opraviť a uložiť.
        </p>
      )}
      {instanceConfiguration?.state === 'loaded' && (
        <p className={'configuration-summary ' + (instanceConfiguration.tax.ready ? 'configuration-summary-ok' : 'configuration-summary-error')}
          role={instanceConfiguration.tax.ready ? undefined : 'alert'}>
          {instanceConfiguration.tax.ready ? 'Daňové nastavenia sú pripravené.' : 'Daňové nastavenia vyžadujú opravu.'}
        </p>
      )}
      <div className="form-grid">
        <label className={'field' + (issueByKey.companyTaxRegime ? ' field-error' : '')}>
          <span>Daňový režim</span>
          <select value={settings.companyTaxRegime} onChange={set('companyTaxRegime')}>
            <option value="">— Vyberte režim —</option>
            <option value="sk_vat_payer">Slovenský platca DPH</option>
          </select>
          {issueByKey.companyTaxRegime && <small>{issueByKey.companyTaxRegime === 'missing' ? 'Povinné pole chýba.' : 'Hodnota nie je platná.'}</small>}
        </label>
        <label className={'field' + (issueByKey.vatRate ? ' field-error' : '')}>
          <span>Sadzba DPH (%)</span>
          <input value={settings.vatRate} onChange={set('vatRate')} inputMode="decimal" />
          {issueByKey.vatRate && <small>{issueByKey.vatRate === 'missing' ? 'Povinné pole chýba.' : 'Hodnota nie je platná.'}</small>}
        </label>
      </div>
      <button className="btn" style={{ marginTop: 16 }} onClick={save} disabled={saving}>
        {saving ? 'Ukladá sa…' : 'Uložiť daňové nastavenia'}
      </button>
    </div>
  )
}
