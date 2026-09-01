import { useEffect, useState } from 'react'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Spinner, ErrorBox } from '../../components/ui'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import { fmtMoney, parseNum, fmtMonth, thisMonth, shiftMonth, toIsoDate } from '../../utils/format'
import EmployeeAnalytics from './EmployeeAnalytics.jsx'
import { buildTimeEntryUpdate, timeEntryToForm } from './timeEntryEdit.js'

function EmployeeForm({ employee, onClose, onSaved }) {
  const toast = useToast()
  const isEdit = !!employee
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({ name: employee?.name || '', initials: employee?.initials || '', pairingCode: '' })

  const save = async () => {
    if (!f.name.trim() || !f.initials.trim()) { toast('Vyplňte meno a iniciály', 'err'); return }
    const code = f.pairingCode.trim()
    if (code && !/^\d{6}$/.test(code)) { toast('Priraďovací kód musí mať presne 6 číslic', 'err'); return }
    setSaving(true)
    try {
      await apiCall(isEdit ? 'updateEmployee' : 'addEmployee', {
        employee: {
          ...(isEdit ? { id: employee.id } : {}),
          name: f.name.trim(),
          initials: f.initials.trim().toUpperCase(),
          ...(code ? { pairingCode: code } : {}),
        },
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
        <label className="field span-2">
          <span>Priraďovací kód dielne (6 číslic)</span>
          <input value={f.pairingCode} inputMode="numeric" maxLength={6} placeholder="napr. 482915"
            onChange={e => setF({ ...f, pairingCode: e.target.value.replace(/\D/g, '') })} />
          <small className="muted">
            {isEdit
              ? (employee?.hasPairingCode
                  ? 'Kód je nastavený. Nový zadaj len ak ho chceš zmeniť (prázdne pole ho ponechá).'
                  : 'Kód zatiaľ nie je nastavený. Pracovník sa bez neho nezviaže s telefónom v dielni.')
              : 'Pracovník ho zadá v dielenskej appke, aby sa telefón natrvalo zviazal s jeho menom.'}
          </small>
        </label>
      </div>
    </Modal>
  )
}

function TimeEntryForm({ entry, employees, onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState(() => timeEntryToForm(entry))
  const [options, setOptions] = useState({ projects: [], tasks: [] })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([apiCall('getProjects'), apiCall('getTimeEntryFormData')])
      .then(([projects, formData]) => {
        if (!active) return
        const currentProject = { id: entry.projectId, name: entry.projectName, hourlyRate: entry.hourlyRate }
        setOptions({
          projects: projects.some(project => String(project.id) === String(entry.projectId)) || !entry.projectId ? projects : [...projects, currentProject],
          tasks: formData.tasks || [],
        })
        setLoading(false)
      })
      .catch(error => {
        if (!active) return
        setLoadError(error.message)
        setLoading(false)
      })
    return () => { active = false }
  }, [entry])

  const employeeOptions = employees.some(employee => String(employee.id) === String(entry.employeeId)) || !entry.employeeId
    ? employees
    : [...employees, { id: entry.employeeId, name: entry.employeeName }]
  const set = key => event => setF(current => ({ ...current, [key]: event.target.value }))

  const save = async () => {
    setSaving(true)
    try {
      await apiCall('updateTimeEntry', buildTimeEntryUpdate(f, employeeOptions, options.projects))
      toast('Záznam práce bol upravený')
      onSaved()
    } catch (error) {
      toast('Nepodarilo sa uložiť: ' + error.message, 'err')
      setSaving(false)
    }
  }

  const taskNames = [...new Set(options.tasks.map(task => task.name ?? task).filter(Boolean))]
  const hasInterval = !!f.startTime && !!f.endTime
  return <Modal title="Upraviť záznam práce" onClose={onClose} wide
    footer={<>
      <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
      <button className="btn" onClick={save} disabled={saving || loading || !!loadError}>{saving ? 'Ukladá sa…' : 'Uložiť'}</button>
    </>}>
    {loading ? <p className="muted">Načítavajú sa možnosti…</p> : loadError ? <p className="err-text">Nepodarilo sa načítať možnosti: {loadError}</p> : <div className="form-grid">
      <label className="field"><span>Zamestnanec *</span><select value={f.employeeId} onChange={set('employeeId')}>
        <option value="">— Vyber —</option>{employeeOptions.map(employee => <option value={employee.id} key={employee.id}>{employee.name}</option>)}
      </select></label>
      <label className="field"><span>Projekt *</span><select value={f.projectId} onChange={set('projectId')}>
        <option value="">— Vyber —</option>{options.projects.map(project => <option value={project.id} key={project.id}>{project.name}</option>)}
      </select></label>
      <label className="field span-2"><span>Činnosť *</span><input value={f.task} list="time-entry-task-options" onChange={set('task')} />
        <datalist id="time-entry-task-options">{taskNames.map(name => <option value={name} key={name} />)}</datalist>
      </label>
      <label className="field"><span>Dátum *</span><input type="date" value={f.date} onChange={set('date')} /></label>
      <label className="field"><span>Hodiny *</span><input type="number" min="0.01" step="0.25" value={hasInterval ? '' : f.hours} placeholder={hasInterval ? 'automaticky' : ''} disabled={hasInterval} onChange={set('hours')} /></label>
      <label className="field"><span>Začiatok</span><input type="time" value={f.startTime} onChange={set('startTime')} /></label>
      <label className="field"><span>Koniec</span><input type="time" value={f.endTime} onChange={set('endTime')} /></label>
      <p className="muted span-2">Ak vyplníš začiatok aj koniec, počet hodín sa vypočíta automaticky. Pre záznam iba s počtom hodín nechaj oba časy prázdne.</p>
    </div>}
  </Modal>
}

export default function Employees() {
  const toast = useToast()
  const { can, hasModule } = useAuth()
  const canHours = can('perm_timesheets') && hasModule('workshop')
  const canEditEntries = can('perm_admin') && can('perm_projects_read') && canHours
  const [state, setState] = useState({ loading: true, error: null })
  const [data, setData] = useState({ employees: [], entries: [] })
  const [month, setMonth] = useState(thisMonth())
  const [form, setForm] = useState(null)
  const [entryForm, setEntryForm] = useState(null)

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
                <th>Meno</th><th>Iniciály</th><th>Kód dielne</th>
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
                    <td>{emp.hasPairingCode
                      ? <span className="badge badge-vyroba">nastavený</span>
                      : <span className="muted">—</span>}</td>
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

      {canHours
        ? <EmployeeAnalytics employees={data.employees} entries={data.entries} canEdit={canEditEntries}
            onEdit={entry => setEntryForm(data.entries.find(raw => String(raw.id) === String(entry.id)) || entry)} />
        : <div className="card"><p className="muted">Na zobrazenie štatistík potrebuješ aktívny modul Dielňa a právo na výkazy práce.</p></div>}

      {form && (
        <EmployeeForm employee={form === 'new' ? null : form}
          onClose={() => setForm(null)} onSaved={() => { setForm(null); load() }} />
      )}
      {entryForm && <TimeEntryForm entry={entryForm} employees={data.employees}
        onClose={() => setEntryForm(null)} onSaved={() => { setEntryForm(null); load() }} />}
    </div>
  )
}
