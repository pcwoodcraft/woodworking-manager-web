import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { apiCall } from '../../api/client'
import { toIsoDate, parseNum } from '../../utils/format'

// Ručné doplnenie hodín k projektu (spätné záznamy, práca mimo dielne).
export default function ManualTimeEntryForm({ project, onClose, onSaved }) {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [employees, setEmployees] = useState([])
  const [tasks, setTasks] = useState([])
  const [f, setF] = useState({
    employeeId: '',
    task: '',
    hours: '',
    date: toIsoDate(new Date().toISOString()),
  })

  useEffect(() => {
    apiCall('getTimeEntryFormData')
      .then(d => {
        setEmployees(d.employees || [])
        setTasks(d.tasks || [])
        setLoading(false)
      })
      .catch(e => {
        toast('Nepodarilo sa načítať zoznamy: ' + e.message, 'err')
        setLoading(false)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const save = async () => {
    if (!f.employeeId) { toast('Vyberte pracovníka', 'err'); return }
    if (!f.task.trim()) { toast('Vyplňte činnosť', 'err'); return }
    if (!f.hours || parseNum(f.hours) <= 0) { toast('Vyplňte počet hodín', 'err'); return }
    if (!f.date) { toast('Vyplňte dátum', 'err'); return }
    setSaving(true)
    try {
      await apiCall('addTimeEntry', {
        entry: {
          employeeId: f.employeeId,
          projectId: project.id,
          projectName: project.name,
          task: f.task.trim(),
          hours: parseNum(f.hours),
          date: f.date,
        },
      })
      toast('Hodiny pridané')
      onSaved()
    } catch (e) {
      toast('Nepodarilo sa uložiť: ' + e.message, 'err')
      setSaving(false)
    }
  }

  const taskNames = tasks.map(t => t.name ?? t).filter(Boolean)

  return (
    <Modal
      title={'Pridať hodiny — ' + project.name}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
          <button className="btn" onClick={save} disabled={saving || loading}>
            {saving ? 'Ukladá sa…' : 'Uložiť'}
          </button>
        </>
      }
    >
      {loading ? (
        <p className="muted">Načítava sa…</p>
      ) : employees.length === 0 ? (
        <p className="muted">Zoznam zamestnancov je prázdny — najprv pridajte zamestnancov v module Zamestnanci.</p>
      ) : (
        <div className="form-grid">
          <label className="field span-2">
            <span>Pracovník *</span>
            <select value={f.employeeId} onChange={set('employeeId')}>
              <option value="">— Vyberte —</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </label>
          <label className="field span-2">
            <span>Činnosť *</span>
            <input
              list="task-options"
              value={f.task}
              onChange={set('task')}
              placeholder="Vyberte zo zoznamu alebo napíšte vlastnú"
            />
            <datalist id="task-options">
              {taskNames.map(name => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>
          <label className="field">
            <span>Hodiny *</span>
            <input type="number" step="0.25" min="0.25" value={f.hours} onChange={set('hours')} placeholder="napr. 4" />
          </label>
          <label className="field">
            <span>Dátum *</span>
            <input type="date" value={f.date} onChange={set('date')} />
          </label>
          <p className="muted span-2" style={{ margin: 0 }}>
            Mzdový náklad sa dopočíta z hodinovej sadzby projektu ({project.hourlyRate || '—'} €/h).
            Pre spätné doplnenie nastavte správny dátum.
          </p>
        </div>
      )}
    </Modal>
  )
}
