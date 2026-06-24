import { useEffect, useState } from 'react'
import { apiCall } from '../../api/client'
import { useToast } from '../../components/Toast'
import { ErrorBox } from '../../components/ui'
import { fmtDate } from '../../utils/format'

// Trvalo odmietnuté záznamy hodín z dielne (server ich odmietol ako neplatné).
// Len na čítanie + nastavenie adresy pre denný e-mailový súhrn.
export default function FailedTimeEntriesPanel() {
  const toast = useToast()
  const [state, setState] = useState({ loading: true, error: null })
  const [entries, setEntries] = useState([])
  const [adminEmail, setAdminEmail] = useState('')
  const [savedEmail, setSavedEmail] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)

  const load = async () => {
    setState({ loading: true, error: null })
    try {
      const data = await apiCall('getFailedTimeEntries')
      setEntries(data.entries || [])
      setAdminEmail(data.adminEmail || '')
      setSavedEmail(data.adminEmail || '')
      setState({ loading: false, error: null })
    } catch (e) {
      setState({ loading: false, error: e })
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const saveEmail = async () => {
    const email = adminEmail.trim()
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast('Neplatná e-mailová adresa', 'err'); return
    }
    setSavingEmail(true)
    try {
      const res = await apiCall('saveAdminEmail', { adminEmail: email })
      setSavedEmail(res.adminEmail || '')
      toast(email ? 'Adresa pre denný súhrn uložená' : 'Adresa vymazaná — denný súhrn sa nebude posielať')
    } catch (e) {
      toast('Nepodarilo sa uložiť: ' + e.message, 'err')
    } finally {
      setSavingEmail(false)
    }
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-head">
        <div>
          <h2 style={{ marginBottom: 4 }}>Problematické záznamy hodín</h2>
          <p className="muted">
            Záznamy z dielne, ktoré server odmietol ako neplatné (napr. neznámy pracovník či projekt).
            Kópia je tu uložená — appka ich už neposiela. V prípade potreby zadaj hodiny ručne k projektu.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={load}>Obnoviť</button>
      </div>

      <div className="form-grid" style={{ marginBottom: 16 }}>
        <label className="field span-2">
          <span>E-mail pre denný súhrn</span>
          <input type="email" value={adminEmail} placeholder="meno@pcw.sk"
            onChange={e => setAdminEmail(e.target.value)} />
          <small className="muted">
            Raz denne (o 6:00) príde na túto adresu prehľad nových problematických záznamov.
            {savedEmail ? '' : ' Zatiaľ nie je nastavená — súhrn sa neposiela.'}
          </small>
        </label>
        <div className="field" style={{ alignSelf: 'end' }}>
          <button className="btn" onClick={saveEmail}
            disabled={savingEmail || adminEmail.trim() === savedEmail.trim()}>
            {savingEmail ? 'Ukladá sa…' : 'Uložiť adresu'}
          </button>
        </div>
      </div>

      {state.error
        ? <ErrorBox error={state.error} onRetry={load} />
        : state.loading
          ? <p className="muted">Načítavam…</p>
          : entries.length === 0
            ? <p className="muted">Žiadne problematické záznamy — všetko v poriadku.</p>
            : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Dátum</th><th>Pracovník</th><th>Projekt</th><th>Činnosť</th>
                    <th className="num">Min</th><th>Dôvod</th><th>Notifikovaný</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id}>
                      <td>{fmtDate(e.startTime || e.timestamp)}</td>
                      <td className="strong">{e.employeeName || e.employeeId || '—'}</td>
                      <td>{e.projectName || e.projectId || '—'}</td>
                      <td>{e.task || '—'}</td>
                      <td className="num">{e.durationMin || '—'}</td>
                      <td className="muted">{e.reason || '—'}</td>
                      <td>{e.emailedAt ? 'áno' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
    </div>
  )
}
