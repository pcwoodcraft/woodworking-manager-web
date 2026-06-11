import { useEffect, useState } from 'react'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Spinner, ErrorBox } from '../../components/ui'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'

// Správa používateľov: pridanie (email + šablóna role), úprava jednotlivých
// práv prepínačmi, deaktivácia. Posledného admina stráži server.

const PERM_LABELS = {
  perm_customers: 'Zákazníci (CRM)',
  perm_projects_read: 'Projekty — zobrazenie',
  perm_projects_write: 'Projekty — úprava a zmena stavu',
  perm_invoices_full: 'Faktúry — celkový prehľad a správa',
  perm_invoices_add: 'Faktúry — pridanie k projektu',
  perm_costs_full: 'Náklady — celkový prehľad',
  perm_costs_add: 'Náklady — pridanie k projektu',
  perm_employees: 'Zamestnanci a mzdové údaje',
  perm_timesheets: 'Výkazy práce',
  perm_files: 'Súbory k projektom (od Fázy 2)',
  perm_admin: 'Správa používateľov',
}

const ROLE_LABELS = { admin: 'Admin', obchodnik: 'Obchodník', technik: 'Technik', vyroba: 'Výroba' }

function AddUserModal({ onClose, onSaved }) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({ email: '', name: '', role: 'vyroba' })

  const save = async () => {
    if (!f.email.trim()) { toast('Vyplňte email', 'err'); return }
    setSaving(true)
    try {
      await apiCall('addUser', { user: { email: f.email.trim(), name: f.name.trim(), role: f.role } })
      toast('Používateľ pridaný — práva podľa šablóny môžete hneď upraviť')
      onSaved()
    } catch (e) {
      toast('Nepodarilo sa pridať: ' + e.message, 'err')
      setSaving(false)
    }
  }

  return (
    <Modal title="Nový používateľ" onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Ukladá sa…' : 'Pridať'}</button>
      </>}>
      <div className="form-grid">
        <label className="field span-2"><span>Google email (firemný) *</span>
          <input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="meno@pcw.sk" />
        </label>
        <label className="field"><span>Meno</span>
          <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
        </label>
        <label className="field"><span>Rola (šablóna práv)</span>
          <select value={f.role} onChange={e => setF({ ...f, role: e.target.value })}>
            {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>
      <p className="muted" style={{ marginTop: 10 }}>
        Rola len prednastaví práva — po pridaní ich môžete jednotlivo upraviť prepínačmi.
      </p>
    </Modal>
  )
}

function EditUserModal({ user, selfEmail, onClose, onSaved }) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [active, setActive] = useState(user.active)
  const [perms, setPerms] = useState(
    Object.fromEntries(Object.keys(PERM_LABELS).map(k => [k, !!user[k]]))
  )
  const isSelf = user.email === selfEmail

  const save = async () => {
    setSaving(true)
    try {
      await apiCall('updateUser', { user: { email: user.email, active, ...perms } })
      toast('Práva uložené' + (isSelf ? ' — zmeny vlastných práv sa prejavia do ~10 minút' : ''))
      onSaved()
    } catch (e) {
      toast('Nepodarilo sa uložiť: ' + e.message, 'err')
      setSaving(false)
    }
  }

  return (
    <Modal title={user.name || user.email} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Ukladá sa…' : 'Uložiť'}</button>
      </>}>
      <p className="muted" style={{ marginBottom: 14 }}>{user.email} · šablóna: {ROLE_LABELS[user.role] || user.role}</p>

      <label className="switch-row switch-row-main">
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
        <span><b>Aktívny účet</b> — vypnutím stratí prístup do systému</span>
      </label>

      <div className="perm-list">
        {Object.entries(PERM_LABELS).map(([key, label]) => (
          <label key={key} className="switch-row">
            <input type="checkbox" checked={perms[key]}
              onChange={e => setPerms({ ...perms, [key]: e.target.checked })} />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </Modal>
  )
}

export default function Admin() {
  const { me } = useAuth()
  const [state, setState] = useState({ loading: true, error: null })
  const [users, setUsers] = useState([])
  const [modal, setModal] = useState(null) // 'new' | user

  const load = async () => {
    setState({ loading: true, error: null })
    try {
      setUsers(await apiCall('getUsers'))
      setState({ loading: false, error: null })
    } catch (e) {
      setState({ loading: false, error: e })
    }
  }

  useEffect(() => { load() }, [])

  if (state.loading) return <Spinner />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  return (
    <div className="page">
      <header className="page-head">
        <h1>Administrácia</h1>
        <button className="btn" onClick={() => setModal('new')}>+ Nový používateľ</button>
      </header>

      <div className="card">
        <table className="table table-click">
          <thead>
            <tr><th>Meno</th><th>Email</th><th>Rola</th><th>Stav</th><th>Práva</th></tr>
          </thead>
          <tbody>
            {users.map(u => {
              const permCount = Object.keys(PERM_LABELS).filter(k => u[k]).length
              return (
                <tr key={u.email} onClick={() => setModal(u)}>
                  <td className="strong">{u.name || '—'}</td>
                  <td>{u.email}</td>
                  <td>{ROLE_LABELS[u.role] || u.role}</td>
                  <td>{u.active
                    ? <span className="pill pill-ok">aktívny</span>
                    : <span className="pill pill-off">deaktivovaný</span>}</td>
                  <td className="muted">{permCount} z {Object.keys(PERM_LABELS).length}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="muted" style={{ marginTop: 12 }}>
          Kliknutím na používateľa upravíte jeho práva. Nového používateľa sa po pridaní stačí
          prihlásiť firemným Google účtom — heslo sa nikde nenastavuje.
        </p>
      </div>

      {modal === 'new' && <AddUserModal onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />}
      {modal && modal !== 'new' && (
        <EditUserModal user={modal} selfEmail={me?.email}
          onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />
      )}
    </div>
  )
}
