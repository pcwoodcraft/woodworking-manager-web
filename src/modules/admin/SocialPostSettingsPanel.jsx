import { useEffect, useState } from 'react'
import { apiCall } from '../../api/client'
import { useToast } from '../../components/Toast'
import { Spinner } from '../../components/ui'

export default function SocialPostSettingsPanel() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    socialPostPrompt: '',
    socialPostDebounceMinutes: '30',
    socialMaxPhotosPerPost: '10',
    socialDefaultScheduleRule: ''
  })

  const load = async () => {
    setLoading(true)
    try {
      const d = await apiCall('getSocialPostSettings')
      setForm({
        socialPostPrompt: d.socialPostPrompt || '',
        socialPostDebounceMinutes: String(d.socialPostDebounceMinutes ?? 30),
        socialMaxPhotosPerPost: String(d.socialMaxPhotosPerPost ?? 10),
        socialDefaultScheduleRule: d.socialDefaultScheduleRule || ''
      })
    } catch (e) {
      toast('Nepodarilo sa načítať: ' + e.message, 'err')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setSaving(true)
    try {
      await apiCall('saveSocialPostSettings', form)
      toast('Nastavenia sociálnych príspevkov uložené')
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner label="Načítavam…" />

  return (
    <div className="card">
      <h2>Sociálne príspevky — prompt a pravidlá</h2>
      <p className="muted">Zmena promptu platí pri ďalšom generovaní textu (Claude).</p>
      <div className="form-grid">
        <label className="field span-2"><span>Prompt pre Claude</span>
          <textarea rows={10} value={form.socialPostPrompt}
            onChange={e => setForm({ ...form, socialPostPrompt: e.target.value })} />
        </label>
        <label className="field"><span>Debounce (min)</span>
          <input type="number" value={form.socialPostDebounceMinutes}
            onChange={e => setForm({ ...form, socialPostDebounceMinutes: e.target.value })} />
        </label>
        <label className="field"><span>Max fotiek / príspevok</span>
          <input type="number" value={form.socialMaxPhotosPerPost}
            onChange={e => setForm({ ...form, socialMaxPhotosPerPost: e.target.value })} />
        </label>
        <label className="field span-2"><span>Pravidlo času (JSON)</span>
          <textarea rows={3} value={form.socialDefaultScheduleRule}
            onChange={e => setForm({ ...form, socialDefaultScheduleRule: e.target.value })} />
        </label>
      </div>
      <button className="btn" onClick={save} disabled={saving}>{saving ? 'Ukladám…' : 'Uložiť'}</button>
    </div>
  )
}
