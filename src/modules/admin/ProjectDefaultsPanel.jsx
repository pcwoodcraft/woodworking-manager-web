import { useEffect, useState } from 'react'
import { apiCall } from '../../api/client'
import { useToast } from '../../components/Toast'
import { ErrorBox } from '../../components/ui'

// F2/T10-01 — štandardná hodinová sadzba dielne.
//
// POZOR na výklad: toto NIE JE sadzba, ktorou sa počítajú mzdové náklady. Tá patrí projektu.
// Toto je len hodnota, ktorou sa predvypĺňa formulár nového projektu a dialóg prevodu ponuky
// či dopytu. Do výpočtu marže sa nedostane nikdy — práve tichý dosadený default (konštanta 25
// v kóde, hoci dielňa účtuje 30) bol pôvodná chyba.
export default function ProjectDefaultsPanel() {
  const toast = useToast()
  const [state, setState] = useState({ loading: true, error: null })
  const [hodnota, setHodnota] = useState('')
  const [ulozene, setUlozene] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setState({ loading: true, error: null })
    try {
      const data = await apiCall('getProjectDefaultsAdmin')
      const v = data?.defaultHourlyRate == null ? '' : String(data.defaultHourlyRate)
      setHodnota(v)
      setUlozene(v)
      setState({ loading: false, error: null })
    } catch (e) {
      setState({ loading: false, error: e })
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setSaving(true)
    try {
      // Server vracia to, čo naozaj uložil (read-back), nie ozvenu vstupu — preto sa
      // zobrazená hodnota prepisuje jeho odpoveďou.
      const res = await apiCall('saveProjectDefaultsAdmin', { defaultHourlyRate: hodnota })
      const v = res?.defaultHourlyRate == null ? '' : String(res.defaultHourlyRate)
      setHodnota(v)
      setUlozene(v)
      toast(v ? 'Štandardná sadzba uložená: ' + v + ' €/h' : 'Štandardná sadzba zrušená')
    } catch (e) {
      toast('Nepodarilo sa uložiť: ' + e.message, 'err')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h2 style={{ marginBottom: 4 }}>Projekty — štandardná hodinová sadzba</h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        Hodnota, ktorou sa <b>predvypĺňa</b> nový projekt a prevod ponuky či dopytu na projekt.
        Sadzba sa vždy ukladá ku konkrétnemu projektu a dá sa v ňom kedykoľvek zmeniť —
        toto nastavenie spätne neprepočítava nič a do výpočtu marže nevstupuje.
      </p>

      {state.error
        ? <ErrorBox error={state.error} onRetry={load} />
        : state.loading
          ? <p className="muted">Načítavam…</p>
          : (
            <>
              <div className="form-grid">
                <label className="field">
                  <span>Štandardná sadzba (€/h)</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={hodnota}
                    placeholder="napr. 30"
                    onChange={e => setHodnota(e.target.value)}
                  />
                  <small className="muted">
                    Prázdne pole = bez predvyplnenia; sadzbu potom zadá človek pri každom projekte.
                  </small>
                </label>
              </div>

              <div style={{ marginTop: 12 }}>
                <button className="btn" onClick={save} disabled={saving || hodnota === ulozene}>
                  {saving ? 'Ukladá sa…' : 'Uložiť'}
                </button>
              </div>
            </>
          )}
    </div>
  )
}
