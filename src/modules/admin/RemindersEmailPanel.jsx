import { useEffect, useState } from 'react'
import { apiCall } from '../../api/client'
import { useToast } from '../../components/Toast'
import { ErrorBox } from '../../components/ui'

export default function RemindersEmailPanel() {
  const toast = useToast()
  const [state, setState] = useState({ loading: true, error: null })
  const [form, setForm] = useState({
    remindersEmailEnabled: false,
    alertAdvanceDays: 14,
    alertDeadlineDays: 7,
    alertStaleDays: 7,
    alertComplaintNewDays: 3,
    alertComplaintProgressDays: 7,
  })
  const [saved, setSaved] = useState(null)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)

  const load = async () => {
    setState({ loading: true, error: null })
    try {
      const data = await apiCall('getRemindersEmailSettings')
      setForm({
        remindersEmailEnabled: !!data.remindersEmailEnabled,
        alertAdvanceDays: data.alertAdvanceDays || 14,
        alertDeadlineDays: data.alertDeadlineDays || 7,
        alertStaleDays: data.alertStaleDays || 7,
        alertComplaintNewDays: data.alertComplaintNewDays || 3,
        alertComplaintProgressDays: data.alertComplaintProgressDays || 7,
      })
      setSaved(data)
      setState({ loading: false, error: null })
    } catch (e) {
      setState({ loading: false, error: e })
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setSaving(true)
    try {
      const res = await apiCall('saveRemindersEmailSettings', form)
      setSaved(res)
      toast('Nastavenia pripomienok uložené')
    } catch (e) {
      toast('Nepodarilo sa uložiť: ' + e.message, 'err')
    } finally {
      setSaving(false)
    }
  }

  const sendNow = async () => {
    setSending(true)
    try {
      const res = await apiCall('resendOperationalAlertsEmail')
      if (res.sent) {
        toast('E-mail odoslaný (' + res.count + ' pripomienok) → ' + (res.to || ''))
      } else if (res.reason === 'empty') {
        toast('Žiadne pripomienky — e-mail sa neposielal', 'err')
      } else {
        toast('E-mail sa neodoslal: ' + (res.reason || 'neznáma chyba'), 'err')
      }
    } catch (e) {
      toast('Nepodarilo sa odoslať: ' + e.message, 'err')
    } finally {
      setSending(false)
    }
  }

  const changed = saved && (
    form.remindersEmailEnabled !== !!saved.remindersEmailEnabled
    || String(form.alertAdvanceDays) !== String(saved.alertAdvanceDays)
    || String(form.alertDeadlineDays) !== String(saved.alertDeadlineDays)
    || String(form.alertStaleDays) !== String(saved.alertStaleDays)
    || String(form.alertComplaintNewDays) !== String(saved.alertComplaintNewDays)
    || String(form.alertComplaintProgressDays) !== String(saved.alertComplaintProgressDays)
  )

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h2 style={{ marginBottom: 4 }}>Denný e-mail s pripomienkami</h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        Voliteľný súhrn operatívnych pripomienok (zálohy, termíny, neaktívne dopyty).
        Odosiela sa o 6:15 na rovnakú adresu ako problematické hodiny z dielne.
      </p>

      {state.error
        ? <ErrorBox error={state.error} onRetry={load} />
        : state.loading
          ? <p className="muted">Načítavam…</p>
          : (
            <>
              <label className="switch-row switch-row-main" style={{ marginBottom: 16 }}>
                <input
                  type="checkbox"
                  checked={form.remindersEmailEnabled}
                  onChange={e => setForm({ ...form, remindersEmailEnabled: e.target.checked })}
                />
                <span><b>Posielať denný e-mail s pripomienkami</b></span>
              </label>

              <div className="form-grid">
                <label className="field">
                  <span>Záloha — dní pred štartom</span>
                  <input type="number" min={1} value={form.alertAdvanceDays}
                    onChange={e => setForm({ ...form, alertAdvanceDays: e.target.value })} />
                </label>
                <label className="field">
                  <span>Termín projektu — dní dopredu</span>
                  <input type="number" min={1} value={form.alertDeadlineDays}
                    onChange={e => setForm({ ...form, alertDeadlineDays: e.target.value })} />
                </label>
                <label className="field">
                  <span>Neaktívny dopyt — dní</span>
                  <input type="number" min={1} value={form.alertStaleDays}
                    onChange={e => setForm({ ...form, alertStaleDays: e.target.value })} />
                </label>
                {/* F6/T1-03: reklamácia je jediný bod, kde je zákazník už nespokojný — doteraz
                    sa v pripomienkach nepripomínala vôbec. Meria sa od poslednej zmeny stavu. */}
                <label className="field">
                  <span>Nová reklamácia — dní bez pohybu</span>
                  <input type="number" min={1} value={form.alertComplaintNewDays}
                    onChange={e => setForm({ ...form, alertComplaintNewDays: e.target.value })} />
                </label>
                <label className="field">
                  <span>Riešená reklamácia — dní bez pohybu</span>
                  <input type="number" min={1} value={form.alertComplaintProgressDays}
                    onChange={e => setForm({ ...form, alertComplaintProgressDays: e.target.value })} />
                </label>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                <button className="btn" onClick={save} disabled={saving || !changed}>
                  {saving ? 'Ukladá sa…' : 'Uložiť nastavenia'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={sendNow} disabled={sending || state.loading}>
                  {sending ? 'Odosiela sa…' : 'Odoslať e-mail teraz'}
                </button>
              </div>
            </>
          )}
    </div>
  )
}
