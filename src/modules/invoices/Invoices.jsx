import { useEffect, useState } from 'react'
import { apiCall } from '../../api/client'
import { Spinner, ErrorBox } from '../../components/ui'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import { fmtMoney, fmtDate, parseNum, toIsoDate, invoiceMonth, fmtMonth } from '../../utils/format'

// Faktúry: Prijaté (predvolená záložka, filter mesiac/stav/dodávateľ) + Vydané.

function IncomingEdit({ invoice, projects, onClose, onSaved }) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    status: invoice.status || 'Nezaplatená',
    category: invoice.category || '',
    projectId: invoice.projectId || '',
    notes: invoice.notes || '',
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const save = async () => {
    const proj = projects.find(p => p.id === f.projectId)
    setSaving(true)
    try {
      await apiCall('updateIncomingInvoice', {
        invoice: {
          id: invoice.id,
          status: f.status,
          category: f.category,
          projectId: f.projectId,
          projectName: proj ? proj.name : '',
          notes: f.notes,
        },
      })
      toast('Faktúra uložená')
      onSaved()
    } catch (e) {
      toast('Nepodarilo sa uložiť: ' + e.message, 'err')
      setSaving(false)
    }
  }

  return (
    <Modal title={invoice.vendor + ' — ' + (invoice.invoiceNumber || 'bez čísla')} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Ukladá sa…' : 'Uložiť'}</button>
      </>}>
      <div className="form-grid">
        <label className="field"><span>Stav</span>
          <select value={f.status} onChange={set('status')}>
            <option>Nezaplatená</option><option>Zaplatená</option>
          </select>
        </label>
        <label className="field"><span>Kategória</span><input value={f.category} onChange={set('category')} /></label>
        <label className="field span-2"><span>Projekt</span>
          <select value={f.projectId} onChange={set('projectId')}>
            <option value="">— Bez projektu —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="field span-2"><span>Poznámky</span><textarea rows={2} value={f.notes} onChange={set('notes')} /></label>
      </div>
      <p className="muted" style={{ marginTop: 10 }}>
        Suma: <b>{fmtMoney(invoice.amountGross)}</b> · vystavená {fmtDate(invoice.issueDate)} · splatná {fmtDate(invoice.dueDate)}
        {invoice.driveLink && <> · <a href={invoice.driveLink} target="_blank" rel="noreferrer">PDF na Drive</a></>}
      </p>
    </Modal>
  )
}

function IssuedForm({ invoice, projects, onClose, onSaved }) {
  const toast = useToast()
  const isEdit = !!invoice
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    number: invoice?.number || '',
    projectId: invoice?.projectId || '',
    customer: invoice?.customer || '',
    amount: invoice?.amount || '',
    status: invoice?.status || 'Neuhradená',
    issueDate: toIsoDate(invoice?.issueDate) || '',
    dueDate: toIsoDate(invoice?.dueDate) || '',
    notes: invoice?.notes || '',
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const save = async () => {
    if (!f.number.trim() || f.amount === '') { toast('Vyplňte číslo faktúry a sumu', 'err'); return }
    const proj = projects.find(p => p.id === f.projectId)
    setSaving(true)
    try {
      await apiCall(isEdit ? 'updateInvoice' : 'addInvoice', {
        invoice: {
          id: invoice?.id || 'I' + Date.now(),
          number: f.number.trim(),
          projectId: f.projectId,
          project: proj ? proj.name : (invoice?.project || ''),
          customer: f.customer || (proj ? proj.customer : ''),
          amount: parseNum(f.amount),
          status: f.status,
          issueDate: f.issueDate,
          dueDate: f.dueDate,
          notes: f.notes,
        },
      })
      toast(isEdit ? 'Faktúra uložená' : 'Faktúra pridaná')
      onSaved()
    } catch (e) {
      toast('Nepodarilo sa uložiť: ' + e.message, 'err')
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Upraviť vydanú faktúru' : 'Nová vydaná faktúra'} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Ukladá sa…' : 'Uložiť'}</button>
      </>}>
      <div className="form-grid">
        <label className="field"><span>Číslo faktúry *</span><input value={f.number} onChange={set('number')} /></label>
        <label className="field"><span>Suma (€) *</span><input type="number" value={f.amount} onChange={set('amount')} /></label>
        <label className="field span-2"><span>Projekt (nepovinné)</span>
          <select value={f.projectId} onChange={set('projectId')}>
            <option value="">— Bez projektu —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="field span-2"><span>Zákazník</span><input value={f.customer} onChange={set('customer')} /></label>
        <label className="field"><span>Vystavená</span><input type="date" value={f.issueDate} onChange={set('issueDate')} /></label>
        <label className="field"><span>Splatnosť</span><input type="date" value={f.dueDate} onChange={set('dueDate')} /></label>
        <label className="field"><span>Stav</span>
          <select value={f.status} onChange={set('status')}>
            <option>Neuhradená</option><option>Uhradená</option>
          </select>
        </label>
        <label className="field span-2"><span>Poznámky</span><textarea rows={2} value={f.notes} onChange={set('notes')} /></label>
      </div>
    </Modal>
  )
}

export default function Invoices() {
  const toast = useToast()
  const [state, setState] = useState({ loading: true, error: null })
  const [data, setData] = useState({ incoming: [], invoices: [], projects: [] })
  const [tab, setTab] = useState('prijate')
  const [filt, setFilt] = useState({ month: '', status: '', vendor: '' })
  const [modal, setModal] = useState(null) // {type:'incoming',inv} | {type:'issued',inv} | 'new-issued'

  const load = async () => {
    setState({ loading: true, error: null })
    try {
      const [incoming, invoices, projects] = await Promise.all([
        apiCall('getIncomingInvoices'), apiCall('getInvoices'), apiCall('getProjects'),
      ])
      setData({ incoming, invoices, projects })
      setState({ loading: false, error: null })
    } catch (e) {
      setState({ loading: false, error: e })
    }
  }

  useEffect(() => { load() }, [])

  if (state.loading) return <Spinner />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  const months = [...new Set(data.incoming.map(invoiceMonth).filter(Boolean))].sort().reverse()
  const vendors = [...new Set(data.incoming.map(i => i.vendor).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'sk'))

  const incoming = data.incoming
    .filter(i => !filt.month || invoiceMonth(i) === filt.month)
    .filter(i => !filt.status || i.status === filt.status)
    .filter(i => !filt.vendor || i.vendor === filt.vendor)
    .sort((a, b) => (toIsoDate(b.dueDate) || '').localeCompare(toIsoDate(a.dueDate) || ''))
  const incomingTotal = incoming.reduce((s, i) => s + parseNum(i.amountGross), 0)

  const issued = [...data.invoices]
    .sort((a, b) => (toIsoDate(b.issueDate) || '').localeCompare(toIsoDate(a.issueDate) || ''))

  const togglePaid = async (inv) => {
    const next = inv.status === 'Zaplatená' ? 'Nezaplatená' : 'Zaplatená'
    try {
      await apiCall('updateIncomingInvoice', { invoice: { id: inv.id, status: next } })
      toast(next === 'Zaplatená' ? 'Označená ako zaplatená' : 'Označená ako nezaplatená')
      load()
    } catch (e) {
      toast('Nepodarilo sa uložiť: ' + e.message, 'err')
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>Faktúry</h1>
        {tab === 'vydane' && <button className="btn" onClick={() => setModal('new-issued')}>+ Nová vydaná faktúra</button>}
      </header>

      <div className="tabs">
        <button className={tab === 'prijate' ? 'tab active' : 'tab'} onClick={() => setTab('prijate')}>Prijaté ({data.incoming.length})</button>
        <button className={tab === 'vydane' ? 'tab active' : 'tab'} onClick={() => setTab('vydane')}>Vydané ({data.invoices.length})</button>
      </div>

      {tab === 'prijate' && (
        <>
          <div className="filter-bar">
            <select value={filt.month} onChange={e => setFilt({ ...filt, month: e.target.value })}>
              <option value="">Všetky mesiace</option>
              {months.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
            </select>
            <select value={filt.status} onChange={e => setFilt({ ...filt, status: e.target.value })}>
              <option value="">Všetky stavy</option>
              <option>Nezaplatená</option><option>Zaplatená</option>
            </select>
            <select value={filt.vendor} onChange={e => setFilt({ ...filt, vendor: e.target.value })}>
              <option value="">Všetci dodávatelia</option>
              {vendors.map(v => <option key={v}>{v}</option>)}
            </select>
            <div className="filter-total">Spolu: <b>{fmtMoney(incomingTotal)}</b></div>
          </div>

          <div className="card">
            {incoming.length === 0 ? <p className="muted">Žiadne faktúry pre zvolený filter.</p> : (
              <table className="table">
                <thead>
                  <tr><th>Dodávateľ</th><th>Číslo</th><th>Splatnosť</th><th>Projekt</th><th>Stav</th><th className="num">Suma</th><th /></tr>
                </thead>
                <tbody>
                  {incoming.map(i => {
                    const od = i.status === 'Nezaplatená' && toIsoDate(i.dueDate) && toIsoDate(i.dueDate) < toIsoDate(new Date().toISOString())
                    return (
                      <tr key={i.id}>
                        <td className="strong">{i.vendor}</td>
                        <td>{i.driveLink ? <a href={i.driveLink} target="_blank" rel="noreferrer">{i.invoiceNumber || 'PDF'}</a> : i.invoiceNumber}</td>
                        <td className={od ? 'overdue' : ''}>{fmtDate(i.dueDate)}{od ? ' ⚠' : ''}</td>
                        <td>{i.projectName}</td>
                        <td>
                          <button
                            className={'pill ' + (i.status === 'Zaplatená' ? 'pill-ok' : 'pill-warn')}
                            title="Kliknutím prepnete stav"
                            onClick={() => togglePaid(i)}
                          >{i.status}</button>
                        </td>
                        <td className="num">{fmtMoney(i.amountGross)}</td>
                        <td className="row-action">
                          <button className="icon-btn" title="Upraviť" onClick={() => setModal({ type: 'incoming', inv: i })}>✎</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'vydane' && (
        <div className="card">
          {issued.length === 0 ? <p className="muted">Zatiaľ žiadne vydané faktúry.</p> : (
            <table className="table">
              <thead>
                <tr><th>Číslo</th><th>Projekt</th><th>Zákazník</th><th>Vystavená</th><th>Splatnosť</th><th>Stav</th><th className="num">Suma</th><th /></tr>
              </thead>
              <tbody>
                {issued.map(i => (
                  <tr key={i.id}>
                    <td className="strong">{i.number}</td>
                    <td>{i.project}</td>
                    <td>{i.customer}</td>
                    <td>{fmtDate(i.issueDate)}</td>
                    <td>{fmtDate(i.dueDate)}</td>
                    <td>{i.status}</td>
                    <td className="num">{fmtMoney(i.amount)}</td>
                    <td className="row-action">
                      <button className="icon-btn" title="Upraviť" onClick={() => setModal({ type: 'issued', inv: i })}>✎</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {modal?.type === 'incoming' && (
        <IncomingEdit invoice={modal.inv} projects={data.projects} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />
      )}
      {(modal === 'new-issued' || modal?.type === 'issued') && (
        <IssuedForm invoice={modal === 'new-issued' ? null : modal.inv} projects={data.projects} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />
      )}
    </div>
  )
}
