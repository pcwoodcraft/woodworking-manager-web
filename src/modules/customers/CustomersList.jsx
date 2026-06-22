import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { Spinner, ErrorBox } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { fmtDate } from '../../utils/format'
import CustomerForm from './CustomerForm'
import { customerDisplayName, customerStatusLabel, customerTypeLabel } from './crmConstants'

export default function CustomersList() {
  const toast = useToast()
  const navigate = useNavigate()
  const [state, setState] = useState({ loading: true, error: null })
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(null)

  const load = async () => {
    setState({ loading: true, error: null })
    try {
      setCustomers(await apiCall('getCustomers'))
      setState({ loading: false, error: null })
    } catch (e) {
      setState({ loading: false, error: e })
    }
  }

  useEffect(() => { load() }, [])

  const remove = async (c) => {
    const name = customerDisplayName(c)
    if (!window.confirm('Naozaj odstrániť zákazníka „' + name + '“?')) return
    try {
      await apiCall('deleteCustomer', { id: c.id })
      toast('Zákazník odstránený')
      load()
    } catch (e) {
      toast('Nepodarilo sa odstrániť: ' + e.message, 'err')
    }
  }

  if (state.loading) return <Spinner />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  const q = search.trim().toLowerCase()
  const visible = customers.filter(c =>
    !q || [c.firstName, c.lastName, c.company, c.phone, c.email, c.address, c.city]
      .some(v => (v || '').toLowerCase().includes(q))
  )

  return (
    <>
      <div className="page-head" style={{ marginBottom: 16 }}>
        <p className="muted">Zoznam účtov a rýchly prístup ku kartám zákazníkov.</p>
        <button className="btn" onClick={() => setForm('new')}>+ Nový zákazník</button>
      </div>

      <div className="filter-bar">
        <input className="filter-search" placeholder="Hľadať meno, firmu, telefón…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card">
        {visible.length === 0 ? <p className="muted">Žiadni zákazníci.</p> : (
          <table className="table table-click">
            <thead>
              <tr>
                <th>Meno / firma</th>
                <th>Typ</th>
                <th>Stav</th>
                <th>Telefón</th>
                <th>Posledný kontakt</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map(c => (
                <tr key={c.id} onClick={() => navigate('/zakaznici/' + c.id)}>
                  <td className="strong">{customerDisplayName(c)}</td>
                  <td>{customerTypeLabel(c.customerType)}</td>
                  <td>{customerStatusLabel(c.customerStatus)}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{fmtDate(c.lastContact)}</td>
                  <td className="row-action" onClick={e => e.stopPropagation()}>
                    <button className="icon-btn" title="Upraviť" onClick={() => setForm(c)}>✎</button>{' '}
                    <button className="icon-btn" title="Odstrániť" onClick={() => remove(c)}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {form && (
        <CustomerForm
          customer={form === 'new' ? null : form}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); load() }}
        />
      )}
    </>
  )
}
