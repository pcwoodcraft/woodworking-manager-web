import { useEffect, useState } from 'react'
import { apiCall } from '../../api/client'
import { Spinner, ErrorBox } from '../../components/ui'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import {
  fmtMoney, parseNum, fmtMonth, thisMonth, shiftMonth, invoiceMonth,
} from '../../utils/format'

// Mesačné náklady: fixné (soft-delete cez endMonth), jednorazové, mzdové,
// prijaté faktúry v mesiaci a celkový súčet.

const COST_KINDS = {
  fixed: { title: 'Fixný náklad', action: { add: 'addFixedCost', update: 'updateFixedCost' }, prefix: 'FC' },
  oneoff: { title: 'Jednorazový náklad', action: { add: 'addOneoffCost', update: 'updateOneoffCost' }, prefix: 'OC' },
  labor: { title: 'Mzdový náklad', action: { add: 'addLaborCost', update: 'updateLaborCost' }, prefix: 'LC' },
}

function CostForm({ kind, cost, month, onClose, onSaved }) {
  const toast = useToast()
  const cfg = COST_KINDS[kind]
  const isEdit = !!cost
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    name: cost?.name || '',
    amount: cost?.amount || '',
    dueDay: cost?.dueDay || '',
    category: cost?.category || '',
    notes: cost?.notes || '',
    startMonth: cost?.startMonth || month,
    month: cost?.month || month,
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const save = async () => {
    if (!f.name.trim() || f.amount === '') { toast('Vyplňte názov a sumu', 'err'); return }
    const base = {
      id: cost?.id || cfg.prefix + Date.now(),
      name: f.name.trim(),
      amount: parseNum(f.amount),
      dueDay: f.dueDay,
      notes: f.notes,
    }
    if (kind === 'fixed') Object.assign(base, { category: f.category, startMonth: f.startMonth, endMonth: cost?.endMonth || '' })
    if (kind === 'oneoff') Object.assign(base, { category: f.category, month: f.month })
    if (kind === 'labor') Object.assign(base, { month: f.month })
    setSaving(true)
    try {
      await apiCall(isEdit ? cfg.action.update : cfg.action.add, { cost: base })
      toast(isEdit ? 'Náklad uložený' : 'Náklad pridaný')
      onSaved()
    } catch (e) {
      toast('Nepodarilo sa uložiť: ' + e.message, 'err')
      setSaving(false)
    }
  }

  return (
    <Modal title={(isEdit ? 'Upraviť: ' : 'Nový: ') + cfg.title.toLowerCase()} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Ukladá sa…' : 'Uložiť'}</button>
      </>}>
      <div className="form-grid">
        <label className="field span-2"><span>Názov *</span><input value={f.name} onChange={set('name')} /></label>
        <label className="field"><span>Suma (€) *</span><input type="number" value={f.amount} onChange={set('amount')} /></label>
        <label className="field"><span>Deň splatnosti</span><input type="number" min="1" max="31" value={f.dueDay} onChange={set('dueDay')} /></label>
        {kind !== 'labor' && (
          <label className="field"><span>Kategória</span><input value={f.category} onChange={set('category')} /></label>
        )}
        {kind === 'fixed' ? (
          <label className="field"><span>Platí od mesiaca</span><input type="month" value={f.startMonth} onChange={set('startMonth')} /></label>
        ) : (
          <label className="field"><span>Mesiac</span><input type="month" value={f.month} onChange={set('month')} /></label>
        )}
        <label className="field span-2"><span>Poznámky</span><textarea rows={2} value={f.notes} onChange={set('notes')} /></label>
      </div>
    </Modal>
  )
}

export default function Costs() {
  const toast = useToast()
  const [state, setState] = useState({ loading: true, error: null })
  const [data, setData] = useState(null)
  const [month, setMonth] = useState(thisMonth())
  const [modal, setModal] = useState(null) // { kind, cost? }

  const load = async () => {
    setState({ loading: true, error: null })
    try {
      const [fixed, oneoff, labor, incoming] = await Promise.all([
        apiCall('getFixedCosts'), apiCall('getOneoffCosts'),
        apiCall('getLaborCosts'), apiCall('getIncomingInvoices'),
      ])
      setData({ fixed, oneoff, labor, incoming })
      setState({ loading: false, error: null })
    } catch (e) {
      setState({ loading: false, error: e })
    }
  }

  useEffect(() => { load() }, [])

  if (state.loading) return <Spinner />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  const fixed = data.fixed.filter(c =>
    (!c.startMonth || c.startMonth <= month) && (!c.endMonth || c.endMonth >= month))
  const oneoff = data.oneoff.filter(c => (c.month || '').substring(0, 7) === month)
  const labor = data.labor.filter(c => (c.month || '').substring(0, 7) === month)
  const invoices = data.incoming.filter(i => invoiceMonth(i) === month)

  const sum = arr => arr.reduce((s, x) => s + parseNum(x.amount ?? x.amountGross), 0)
  const fixedSum = sum(fixed)
  const oneoffSum = sum(oneoff)
  const laborSum = sum(labor)
  const invoicesSum = invoices.reduce((s, i) => s + parseNum(i.amountGross), 0)
  const total = fixedSum + oneoffSum + laborSum + invoicesSum

  const endFixed = async (c) => {
    if (!window.confirm('Ukončiť fixný náklad „' + c.name + '“? Od budúceho mesiaca sa prestane počítať, história zostáva.')) return
    try {
      await apiCall('updateFixedCost', { cost: { id: c.id, endMonth: month } })
      toast('Fixný náklad ukončený (' + fmtMonth(month) + ' je posledný mesiac)')
      load()
    } catch (e) {
      toast('Nepodarilo sa uložiť: ' + e.message, 'err')
    }
  }

  const removeOneoff = async (c, kind) => {
    if (!window.confirm('Naozaj odstrániť „' + c.name + '“?')) return
    try {
      await apiCall(kind === 'oneoff' ? 'deleteOneoffCost' : 'deleteLaborCost', { id: c.id })
      toast('Náklad odstránený')
      load()
    } catch (e) {
      toast('Nepodarilo sa odstrániť: ' + e.message, 'err')
    }
  }

  const section = (title, items, sumVal, kind, columns) => (
    <div className="card">
      <div className="card-head">
        <h2>{title} ({items.length}) — {fmtMoney(sumVal)}</h2>
        {kind && <button className="btn btn-sm" onClick={() => setModal({ kind })}>+ Pridať</button>}
      </div>
      {items.length === 0 ? <p className="muted">Žiadne položky v tomto mesiaci.</p> : columns}
    </div>
  )

  return (
    <div className="page">
      <header className="page-head">
        <h1>Náklady</h1>
        <div className="month-nav">
          <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))}>←</button>
          <span className="month-label">{fmtMonth(month)}</span>
          <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, 1))}>→</button>
          {month !== thisMonth() && <button className="btn btn-sm btn-secondary" onClick={() => setMonth(thisMonth())}>Dnes</button>}
        </div>
      </header>

      <div className="stat-grid">
        <div className="stat-card"><div className="stat-label">Spolu za {fmtMonth(month)}</div><div className="stat-value">{fmtMoney(total)}</div></div>
        <div className="stat-card"><div className="stat-label">Fixné</div><div className="stat-value">{fmtMoney(fixedSum)}</div></div>
        <div className="stat-card"><div className="stat-label">Mzdy</div><div className="stat-value">{fmtMoney(laborSum)}</div></div>
        <div className="stat-card"><div className="stat-label">Faktúry + jednorazové</div><div className="stat-value">{fmtMoney(invoicesSum + oneoffSum)}</div></div>
      </div>

      {section('Fixné náklady', fixed, fixedSum, 'fixed', (
        <table className="table">
          <thead><tr><th>Názov</th><th>Kategória</th><th>Splatnosť</th><th className="num">Suma</th><th /></tr></thead>
          <tbody>
            {fixed.map(c => (
              <tr key={c.id}>
                <td className="strong">{c.name}</td>
                <td>{c.category}</td>
                <td>{c.dueDay ? c.dueDay + '. v mesiaci' : '—'}</td>
                <td className="num">{fmtMoney(c.amount)}</td>
                <td className="row-action">
                  <button className="icon-btn" title="Upraviť" onClick={() => setModal({ kind: 'fixed', cost: c })}>✎</button>{' '}
                  <button className="icon-btn" title="Ukončiť od budúceho mesiaca" onClick={() => endFixed(c)}>⏹</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}

      {section('Jednorazové náklady', oneoff, oneoffSum, 'oneoff', (
        <table className="table">
          <thead><tr><th>Názov</th><th>Kategória</th><th className="num">Suma</th><th /></tr></thead>
          <tbody>
            {oneoff.map(c => (
              <tr key={c.id}>
                <td className="strong">{c.name}</td>
                <td>{c.category}</td>
                <td className="num">{fmtMoney(c.amount)}</td>
                <td className="row-action">
                  <button className="icon-btn" title="Upraviť" onClick={() => setModal({ kind: 'oneoff', cost: c })}>✎</button>{' '}
                  <button className="icon-btn" title="Odstrániť" onClick={() => removeOneoff(c, 'oneoff')}>🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}

      {section('Mzdové náklady', labor, laborSum, 'labor', (
        <table className="table">
          <thead><tr><th>Názov</th><th className="num">Suma</th><th /></tr></thead>
          <tbody>
            {labor.map(c => (
              <tr key={c.id}>
                <td className="strong">{c.name}</td>
                <td className="num">{fmtMoney(c.amount)}</td>
                <td className="row-action">
                  <button className="icon-btn" title="Upraviť" onClick={() => setModal({ kind: 'labor', cost: c })}>✎</button>{' '}
                  <button className="icon-btn" title="Odstrániť" onClick={() => removeOneoff(c, 'labor')}>🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}

      {section('Prijaté faktúry v mesiaci', invoices, invoicesSum, null, (
        <table className="table">
          <thead><tr><th>Dodávateľ</th><th>Číslo</th><th>Stav</th><th className="num">Suma</th></tr></thead>
          <tbody>
            {invoices.map(i => (
              <tr key={i.id}>
                <td className="strong">{i.vendor}</td>
                <td>{i.driveLink ? <a href={i.driveLink} target="_blank" rel="noreferrer">{i.invoiceNumber || 'PDF'}</a> : i.invoiceNumber}</td>
                <td>{i.status}</td>
                <td className="num">{fmtMoney(i.amountGross)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}

      {modal && (
        <CostForm kind={modal.kind} cost={modal.cost} month={month}
          onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />
      )}
    </div>
  )
}
