import { useEffect, useState } from 'react'
import { apiCall } from '../../api/client'
import { useToast } from '../../components/Toast'

const FIELDS = [
  { key: 'companyName', label: 'Názov firmy', span: 2 },
  { key: 'companyTagline', label: 'Podnadpis (tagline)', span: 2 },
  { key: 'companyAddress', label: 'Adresa', span: 2, rows: 2 },
  { key: 'companyIco', label: 'IČO' },
  { key: 'companyDic', label: 'DIČ' },
  { key: 'companyIcDph', label: 'IČ DPH' },
  { key: 'companyIban', label: 'IBAN', span: 2 },
  { key: 'companyBank', label: 'Banka', span: 2 },
  { key: 'companySwift', label: 'SWIFT' },
  { key: 'invoiceConstantSymbol', label: 'Konštantný symbol' },
  { key: 'invoiceIssuedBy', label: 'Vyhotovil' },
  { key: 'vatRate', label: 'Sadzba DPH (%)' },
  { key: 'paymentDays', label: 'Splatnosť (dní)' },
  { key: 'advancePercent', label: 'Záloha (% z ceny projektu)' },
  { key: 'invoiceNextSeq', label: 'Ďalšie číslo — rad F (ostrá faktúra)' },
  { key: 'advanceNextSeq', label: 'Ďalšie číslo — rad Z (záloha)' },
  { key: 'invoiceSeqDigits', label: 'Počet číslic v sekvencii' },
  { key: 'invoiceFooter', label: 'Pätička faktúry', span: 2, rows: 2 },
]

export default function InvoiceSettingsPanel() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [settings, setSettings] = useState({})
  const [nextRegular, setNextRegular] = useState('')
  const [nextAdvance, setNextAdvance] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const d = await apiCall('getInvoiceSettings')
      setSettings(d.settings || {})
      setNextRegular(d.nextRegularPreview || d.nextNumberPreview || '')
      setNextAdvance(d.nextAdvancePreview || '')
    } catch (e) {
      toast('Nepodarilo sa načítať nastavenia: ' + e.message, 'err')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setSettings({ ...settings, [k]: e.target.value })

  const save = async () => {
    setSaving(true)
    try {
      const d = await apiCall('saveInvoiceSettings', { settings })
      setSettings(d.settings || {})
      setNextRegular(d.nextRegularPreview || '')
      setNextAdvance(d.nextAdvancePreview || '')
      toast('Nastavenia fakturácie uložené')
    } catch (e) {
      toast('Nepodarilo sa uložiť: ' + e.message, 'err')
    } finally {
      setSaving(false)
    }
  }

  const sync = async () => {
    if (!window.confirm('Nastaviť ďalšie čísla podľa existujúcich faktúr (rady F a Z zvlášť)?')) return
    setSyncing(true)
    try {
      const d = await apiCall('syncInvoiceSequence')
      setNextRegular(d.nextRegularPreview || '')
      setNextAdvance(d.nextAdvancePreview || '')
      await load()
      toast('Rady synchronizované — F: ' + (d.nextRegularPreview || '—') + ', Z: ' + (d.nextAdvancePreview || '—'))
    } catch (e) {
      toast('Synchronizácia zlyhala: ' + e.message, 'err')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) return <p className="muted">Načítava sa…</p>

  return (
    <div>
      <p className="muted" style={{ marginBottom: 12 }}>
        Ostré faktúry: rad <b>F</b> (zobrazené ako 2026012). Zálohy: rad <b>Z</b> (Z2026002).
        Po úhrade zálohy vystavte <b>ostrú faktúru</b> — tá patrí do radu F.
        Ďalšie číslo F: <b>{nextRegular || '—'}</b> · Z: <b>{nextAdvance || '—'}</b>
      </p>
      <div className="form-grid">
        {FIELDS.map(f => (
          <label key={f.key} className={'field' + (f.span === 2 ? ' span-2' : '')}>
            <span>{f.label}</span>
            {f.rows ? (
              <textarea rows={f.rows} value={settings[f.key] || ''} onChange={set(f.key)} />
            ) : (
              <input value={settings[f.key] || ''} onChange={set(f.key)} />
            )}
          </label>
        ))}
      </div>
      <div className="btn-group" style={{ marginTop: 16 }}>
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? 'Ukladá sa…' : 'Uložiť nastavenia'}
        </button>
        <button className="btn btn-secondary" onClick={sync} disabled={syncing}>
          {syncing ? '…' : 'Synchronizovať rady F a Z'}
        </button>
      </div>
    </div>
  )
}
