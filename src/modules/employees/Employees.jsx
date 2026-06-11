import { useEffect, useState } from 'react'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Spinner, ErrorBox } from '../../components/ui'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import { fmtMoney, parseNum, fmtMonth, thisMonth, shiftMonth, toIsoDate } from '../../utils/format'

function EmployeeForm({ employee, onClose, onSaved }) {
  const toast = useToast()
  const isEdit = !!employee
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({ name: employee?.name || '', initials: employee?.initials || '' })

  const save = async () => {
    if (!f.name.trim() || !f.initials.trim()) { toast('Vyplňte meno a iniciály', 'err'); return }
    setSaving(true)
    try {
      await apiCall(isEdit ? 'updateEmployee' : 'addEmployee', {
        employee: { id: employee?.id || 'EMP' + Date.now(), name: f.name.trim(), initials: f.initials.trim().toUpperCase() },
      })
      toast(isEdit ? 'Zamestnanec uložený' : 'Zamestnanec pridaný')
      onSaved()
    } catch (e) {
      toast('Nepodarilo sa uložiť: ' + e.message, 'err')
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Upraviť zamestnanca' : 'Nový zamestnanec'} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Ukladá sa…' : 'Uložiť'}</button>
      </>}>
      <div className="form-grid">
        <label className="field span-2"><span>Meno *</span><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
        <label className="field"><span>Iniciály *</span><input value={f.initials} maxLength={3} onChange={e => setF({ ...f, initials: e.target.value })} /></label>
      </div>
    </Modal>
  )
}

export default function Employees() {
  const toast = useToast()
  const { can } = useAuth()
  const canHours = can('perm_timesheets')
  const [state, setState] = useState({ loading: true, error: null })
  const [data, setData] = useState({ employees: [], entries: [] })
  const [month, setMonth] = useState(thisMonth())
  const [form, setForm] = useState(null)

  const load = async () => {
    setState({ loading: true, error: null })
    try {
      const [employees, entries] = await Promise.all([
        apiCall('getEmployees'),
        canHours ? apiCall('getTimeEntries') : Promise.resolve([]),
      ])
      setData({ employees, entries })
      setState({ loading: false, error: null })
    } catch (e) {
      setState({ loading: false, error: e })
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (emp) => {
    if (!window.confirm('Naozaj odstrániť zamestnanca „' + emp.name + '“? Jeho výkazy hodín zostávajú zachované.')) return
    try {
      await apiCall('deleteEmployee', { id: emp.id })
      toast('Zamestnanec odstránený')
      load()
    } catch (e) {
      toast('Nepodarilo sa odstrániť: ' + e.message, 'err')
    }
  }

  if (state.loading) return <Spinner />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  // výkaz za mesiac: hodiny a mzdové náklady na zamestnanca
  const monthEntries = data.entries.filter(e =>
    (toIsoDate(e.date) || toIsoDate(e.startTime)).substring(0, 7) === month)
  const byEmp = new Map()
  monthEntries.forEach(e => {
    const key = String(e.employeeId)
    if (!byEmp.has(key)) byEmp.set(key, { hours: 0, cost: 0 })
    const x = byEmp.get(key)
    x.hours += parseNum(e.durationMin) / 60
    x.cost += parseNum(e.laborCost)
  })

  return (
    <div className="page">
      <header className="page-head">
        <h1>Zamestnanci</h1>
        <button className="btn" onClick={() => setForm('new')}>+ Nový zamestnanec</button>
      </header>

      <div className="card">
        <div className="card-head">
          <h2>Evidencia{canHours ? ' a výkaz za mesiac' : ''}</h2>
          {canHours && (
            <div className="month-nav">
              <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))}>←</button>
              <span className="month-label">{fmtMonth(month)}</span>
              <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, 1))}>→</button>
            </div>
          )}
        </div>
        {data.employees.length === 0 ? <p className="muted">Žiadni zamestnanci.</p> : (
          <table className="table">
            <thead>
              <tr>
                <th>Meno</th><th>Iniciály</th>
                {canHours && <><th className="num">Hodiny ({fmtMonth(month)})</th><th className="num">Mzdový náklad</th></>}
                <th />
              </tr>
            </thead>
            <tbody>
              {data.employees.map(emp => {
                const s = byEmp.get(String(emp.id)) || { hours: 0, cost: 0 }
                return (
                  <tr key={emp.id}>
                    <td className="strong">{emp.name}</td>
                    <td>{emp.initials}</td>
                    {canHours && <>
                      <td className="num">{s.hours.toLocaleString('sk-SK', { maximumFractionDigits: 1 })}</td>
                      <td className="num">{fmtMoney(s.cost)}</td>
                    </>}
                    <td className="row-action">
                      <button className="icon-btn" title="Upraviť" onClick={() => setForm(emp)}>✎</button>{' '}
                      <button className="icon-btn" title="Odstrániť" onClick={() => remove(emp)}>🗑</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {form && (
        <EmployeeForm employee={form === 'new' ? null : form}
          onClose={() => setForm(null)} onSaved={() => { setForm(null); load() }} />
      )}
    </div>
  )
}
