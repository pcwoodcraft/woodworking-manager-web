import { useEffect, useState } from 'react'
import { apiCall } from '../../api/client'
import { Spinner, ErrorBox } from '../../components/ui'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import {
  fmtMoney, parseNum, fmtMonth, fmtDate, thisMonth, shiftMonth, toIsoDate,
} from '../../utils/format'

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
      ...(isEdit ? { id: cost.id } : {}),
      name: f.name.trim(),
      amount: parseNum(f.amount),
      dueDay: f.dueDay,
      notes: f.notes,
    }
    if (kind === 'fixed') Object.assign(base, { category: f.category, startMonth: f.startMonth, endMonth: cost?.endMonth || '' })
    if (kind === 'oneoff') Object.assign(base, { category: f.category, month: f.month })
    if (kind === 'labor') Object.assign(base, { month: f.month, status: cost?.status || 'Neuhradené' })
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

function MarkPaidModal({ title, item, onClose, onSave }) {
  const [paidDate, setPaidDate] = useState(toIsoDate(new Date().toISOString()))
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const save = async () => {
    setSaving(true)
    try {
      await onSave(paidDate)
      onClose()
    } catch (e) {
      toast(e.message, 'err')
      setSaving(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Ukladá sa…' : 'Uložiť'}</button>
      </>}>
      <label className="field">
        <span>Dátum úhrady</span>
        <input type="date" value={paidDate} max={toIsoDate(new Date().toISOString())} onChange={e => setPaidDate(e.target.value)} />
      </label>
    </Modal>
  )
}

export default function Costs() {
  const toast = useToast()
  const [state, setState] = useState({ loading: true, error: null })
  const [data, setData] = useState(null)
  const [month, setMonth] = useState(thisMonth())
  const [modal, setModal] = useState(null)
  const [markPaid, setMarkPaid] = useState(null)

  const load = async () => {
    setState({ loading: true, error: null })
    try {
      const page = await apiCall('getEconomicsPage', { month })
      setData(page)
      setState({ loading: false, error: null })
    } catch (e) {
      setState({ loading: false, error: e })
    }
  }

  useEffect(() => { load() }, [month]) // eslint-disable-line react-hooks/exhaustive-deps

  if (state.loading && !data) return <Spinner />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  if (!data) return <Spinner />

  const { fixed, oneoff, labor, incoming } = data
  const cfClass = data.monthResultNet < 0 ? 'budget-label-over' : ''

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

  const toggleLaborPaid = async (c, paidDate) => {
    const paid = String(c.status || '') === 'Uhradené'
    await apiCall('updateLaborCost', {
      cost: paid
        ? { id: c.id, status: 'Neuhradené', paidDate: '' }
        : { id: c.id, status: 'Uhradené', paidDate: paidDate || toIsoDate(new Date().toISOString()) },
    })
    toast(paid ? 'Označené ako neuhradené' : 'Označené ako uhradené')
    load()
  }

  const toggleIncomingPaid = async (inv, paidDate) => {
    const paid = String(inv.status || '') === 'Zaplatená'
    await apiCall('updateIncomingInvoice', {
      invoice: paid
        ? { id: inv.id, status: 'Nezaplatená', paidDate: '' }
        : { id: inv.id, status: 'Zaplatená', paidDate: paidDate || toIsoDate(new Date().toISOString()) },
    })
    toast(paid ? 'Označená ako nezaplatená' : 'Označená ako zaplatená')
    load()
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
        <h1>Ekonomika</h1>
        <div className="month-nav">
          <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))}>←</button>
          <span className="month-label">{fmtMonth(month)}</span>
          <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, 1))}>→</button>
          {month !== thisMonth() && <button className="btn btn-sm btn-secondary" onClick={() => setMonth(thisMonth())}>Dnes</button>}
        </div>
      </header>

      <p className="muted" style={{ marginBottom: 12 }}>
        Cash-flow: reálne prijaté a uhradené v mesiaci, bez DPH.
      </p>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Príjmy</div>
          <div className="stat-value">{fmtMoney(data.monthIncomeNet)}</div>
          <div className="stat-sub">úhrady projektov</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Výdavky</div>
          <div className="stat-value">{fmtMoney(data.monthExpensesNet)}</div>
          <div className="stat-sub">uhradené pohyby + fixné + jednorazové</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cash-flow</div>
          <div className={'stat-value ' + cfClass}>{fmtMoney(data.monthResultNet)}</div>
        </div>
      </div>

      <p className="muted" style={{ marginBottom: 16, fontSize: 13 }}>
        Zobrazené sú len uhradené pohyby (mzdy, prijaté faktúry). Neuhradené doklady sa započítajú v mesiaci úhrady.
        Fixné náklady sa berú každý mesiac podľa platnosti (nemajú dátum úhrady).
      </p>

      {section('Fixné náklady', fixed, data.fixedSum, 'fixed', (
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

      {section('Jednorazové náklady', oneoff, data.oneoffSum, 'oneoff', (
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

      {section('Mzdové náklady', labor, data.laborSum, 'labor', (
        <table className="table">
          <thead><tr><th>Názov</th><th>Stav</th><th>Úhrada</th><th className="num">Suma</th><th /></tr></thead>
          <tbody>
            {labor.map(c => {
              const paid = String(c.status || '') === 'Uhradené'
              return (
                <tr key={c.id}>
                  <td className="strong">{c.name}</td>
                  <td><span className={'pill ' + (paid ? 'pill-ok' : 'pill-warn')}>{c.status || 'Neuhradené'}</span></td>
                  <td>{c.paidDate ? fmtDate(c.paidDate) : '—'}</td>
                  <td className="num">{fmtMoney(c.amount)}</td>
                  <td className="row-action">
                    <button className="icon-btn" title="Upraviť" onClick={() => setModal({ kind: 'labor', cost: c })}>✎</button>{' '}
                    <button className="btn btn-sm btn-secondary" onClick={() => {
                      if (paid) toggleLaborPaid(c)
                      else setMarkPaid({ type: 'labor', item: c })
                    }}>
                      {paid ? 'Zrušiť úhradu' : 'Označiť uhradené'}
                    </button>{' '}
                    <button className="icon-btn" title="Odstrániť" onClick={() => removeOneoff(c, 'labor')}>🗑</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ))}

      {section('Prijaté faktúry v mesiaci', incoming, data.incomingSum, null, (
        <table className="table">
          <thead><tr><th>Dodávateľ</th><th>Číslo</th><th>Stav</th><th>Úhrada</th><th className="num">Suma netto</th><th /></tr></thead>
          <tbody>
            {incoming.map(i => {
              const paid = String(i.status || '') === 'Zaplatená'
              return (
                <tr key={i.id}>
                  <td className="strong">{i.vendor}</td>
                  <td>{i.driveLink ? <a href={i.driveLink} target="_blank" rel="noreferrer">{i.invoiceNumber || 'PDF'}</a> : i.invoiceNumber}</td>
                  <td><span className={'pill ' + (paid ? 'pill-ok' : 'pill-warn')}>{i.status || 'Nezaplatená'}</span></td>
                  <td>{i.paidDate ? fmtDate(i.paidDate) : '—'}</td>
                  <td className="num">{fmtMoney(i.amountNet)}</td>
                  <td className="row-action">
                    <button className="btn btn-sm btn-secondary" onClick={() => {
                      if (paid) toggleIncomingPaid(i)
                      else setMarkPaid({ type: 'incoming', item: i })
                    }}>
                      {paid ? 'Zrušiť úhradu' : 'Označiť uhradené'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ))}

      {modal && (
        <CostForm kind={modal.kind} cost={modal.cost} month={month}
          onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />
      )}

      {markPaid && (
        <MarkPaidModal
          title={markPaid.type === 'labor' ? 'Úhrada mzdového nákladu' : 'Úhrada prijatej faktúry'}
          item={markPaid.item}
          onClose={() => setMarkPaid(null)}
          onSave={async (paidDate) => {
            if (markPaid.type === 'labor') await toggleLaborPaid(markPaid.item, paidDate)
            else await toggleIncomingPaid(markPaid.item, paidDate)
          }}
        />
      )}
    </div>
  )
}
