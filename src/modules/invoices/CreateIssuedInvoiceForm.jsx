import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { apiCall } from '../../api/client'
import { fmtMoney, parseNum, toIsoDate } from '../../utils/format'

const TYPE_LABELS = {
  faktura: 'Faktúra (rad F)',
  zalohova: 'Zálohová faktúra (rad Z)',
  dokoncova: 'Dofakturácia (rad F)',
  ostra: 'Ostrá faktúra (rad F)',
}

const emptyItem = () => ({ description: '', quantity: '1', unit: 'ks', unitPriceNet: '' })

function isForeignVatCustomer(customer) {
  const vatId = String(customer?.vatId || '').trim().toUpperCase().replace(/\s/g, '')
  if (!vatId || vatId.length < 3) return false
  return /^[A-Z]{2}/.test(vatId) && !vatId.startsWith('SK')
}

// Vystavenie faktúry s položkami, automatickým číslom a generovaním PDF (F3).
export default function CreateIssuedInvoiceForm({
  project,
  projects = [],
  customers = [],
  initialType = 'faktura',
  initialItems,
  initialLanguage = 'sk',
  onClose,
  onSaved,
}) {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [nextNumber, setNextNumber] = useState('')
  const [f, setF] = useState({
    type: initialType,
    projectId: project?.id || '',
    customerId: project?.customerId || '',
    customer: project?.customer || '',
    issueDate: toIsoDate(new Date().toISOString()),
    dueDate: '',
    deliveryDate: toIsoDate(new Date().toISOString()),
    notes: '',
    language: initialLanguage === 'en' ? 'en' : 'sk',
    items: initialItems?.length ? initialItems : [emptyItem()],
  })

  useEffect(() => {
    Promise.all([
      apiCall('previewNextInvoiceNumber', { type: initialType, issueDate: f.issueDate }),
    ])
      .then(([num]) => {
        setNextNumber(num.displayNumber || num.number || '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    apiCall('previewNextInvoiceNumber', { type: f.type, issueDate: f.issueDate })
      .then(d => setNextNumber(d.displayNumber || d.number || ''))
      .catch(() => {})
  }, [f.type, f.issueDate])

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const setItem = (idx, k, val) => {
    const items = f.items.map((it, i) => (i === idx ? { ...it, [k]: val } : it))
    setF({ ...f, items })
  }

  const addItem = () => setF({ ...f, items: [...f.items, emptyItem()] })
  const removeItem = (idx) => {
    if (f.items.length <= 1) return
    setF({ ...f, items: f.items.filter((_, i) => i !== idx) })
  }

  const onProjectChange = (projectId) => {
    const p = projects.find(x => x.id === projectId)
    setF({
      ...f,
      projectId,
      customerId: p?.customerId || '',
      customer: p?.customer || f.customer,
    })
  }

  const lineNet = (it) => {
    const qty = parseNum(it.quantity) || 0
    const price = parseNum(it.unitPriceNet) || 0
    return Math.round(qty * price * 100) / 100
  }

  const subtotal = f.items.reduce((s, it) => s + lineNet(it), 0)

  const selectedCustomer = customers.find(c => c.id === f.customerId)
    || (project?.customerId ? customers.find(c => c.id === project.customerId) : null)
  const reverseChargeHint = isForeignVatCustomer(selectedCustomer)

  const save = async () => {
    if (!f.customer.trim() && !f.customerId) {
      toast('Vyplňte zákazníka', 'err')
      return
    }
    const items = f.items.map(it => ({
      description: it.description.trim(),
      quantity: parseNum(it.quantity) || 1,
      unit: it.unit || 'ks',
      unitPriceNet: parseNum(it.unitPriceNet),
    }))
    if (items.some(it => !it.description)) {
      toast('Vyplňte popis všetkých položiek', 'err')
      return
    }
    if (items.some(it => it.unitPriceNet <= 0)) {
      toast('Vyplňte cenu položiek', 'err')
      return
    }
    setSaving(true)
    try {
      const result = await apiCall('createIssuedInvoice', {
        type: f.type,
        projectId: f.projectId,
        customerId: f.customerId,
        customer: f.customer.trim(),
        issueDate: f.issueDate,
        dueDate: f.dueDate || undefined,
        deliveryDate: f.deliveryDate,
        notes: f.notes,
        language: f.language,
        items,
      })
      toast('Faktúra ' + (result.invoice?.number || '') + ' vystavená')
      onSaved(result)
    } catch (e) {
      toast('Nepodarilo sa vystaviť: ' + e.message, 'err')
      setSaving(false)
    }
  }

  const title = project
    ? 'Vystaviť faktúru — ' + project.name
    : 'Nová vydaná faktúra'

  return (
    <Modal
      title={title}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
          <button className="btn" onClick={save} disabled={saving || loading}>
            {saving ? 'Vystavuje sa…' : 'Vystaviť faktúru'}
          </button>
        </>
      }
    >
      {loading ? (
        <p className="muted">Načítava sa…</p>
      ) : (
        <div className="form-grid">
          <label className="field">
            <span>Číslo faktúry</span>
            <input value={nextNumber} readOnly className="readonly" />
            <span className="muted" style={{ fontSize: '0.85em' }}>
              {f.type === 'zalohova' ? 'Rad Z (zálohy)' : 'Rad F (ostré faktúry)'}
            </span>
          </label>
          <label className="field">
            <span>Typ</span>
            <select value={f.type} onChange={set('type')}>
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Jazyk faktúry</span>
            <select value={f.language} onChange={set('language')}>
              <option value="sk">Slovenčina</option>
              <option value="en">English</option>
            </select>
          </label>
          {!project && (
            <label className="field span-2">
              <span>Projekt (nepovinné)</span>
              <select value={f.projectId} onChange={e => onProjectChange(e.target.value)}>
                <option value="">— Bez projektu —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
          )}
          <label className="field span-2">
            <span>Odberateľ *</span>
            {customers.length > 0 && !project ? (
              <select
                value={f.customerId}
                onChange={e => {
                  const c = customers.find(x => x.id === e.target.value)
                  setF({
                    ...f,
                    customerId: e.target.value,
                    customer: c
                      ? ([c.firstName, c.lastName].filter(Boolean).join(' ') || c.company)
                      : f.customer,
                  })
                }}
              >
                <option value="">— Vlastný text —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.company}
                  </option>
                ))}
              </select>
            ) : null}
            <input
              value={f.customer}
              onChange={set('customer')}
              placeholder="Meno alebo firma odberateľa"
              style={{ marginTop: customers.length > 0 && !project ? 8 : 0 }}
            />
          </label>
          <label className="field">
            <span>Dátum vystavenia</span>
            <input type="date" value={f.issueDate} onChange={set('issueDate')} />
          </label>
          <label className="field">
            <span>Dátum dodania</span>
            <input type="date" value={f.deliveryDate} onChange={set('deliveryDate')} />
          </label>
          <label className="field">
            <span>Splatnosť</span>
            <input type="date" value={f.dueDate} onChange={set('dueDate')} placeholder="automaticky" />
          </label>
          <label className="field span-2">
            <span>Poznámky</span>
            <textarea rows={2} value={f.notes} onChange={set('notes')} />
          </label>

          <div className="span-2">
            <div className="card-head" style={{ marginBottom: 8 }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Položky</h3>
              <button type="button" className="btn btn-sm btn-secondary" onClick={addItem}>+ Položka</button>
            </div>
            <table className="table table-compact">
              <thead>
                <tr>
                  <th>Popis</th>
                  <th>Množ.</th>
                  <th>MJ</th>
                  <th className="num">Cena/MJ</th>
                  <th className="num">Suma</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {f.items.map((it, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        value={it.description}
                        onChange={e => setItem(idx, 'description', e.target.value)}
                        placeholder="Popis práce / dodávky"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={it.quantity}
                        onChange={e => setItem(idx, 'quantity', e.target.value)}
                        style={{ width: 64 }}
                      />
                    </td>
                    <td>
                      <input
                        value={it.unit}
                        onChange={e => setItem(idx, 'unit', e.target.value)}
                        style={{ width: 48 }}
                      />
                    </td>
                    <td className="num">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={it.unitPriceNet}
                        onChange={e => setItem(idx, 'unitPriceNet', e.target.value)}
                        style={{ width: 88 }}
                      />
                    </td>
                    <td className="num">{fmtMoney(lineNet(it))}</td>
                    <td>
                      {f.items.length > 1 && (
                        <button type="button" className="icon-btn" title="Odstrániť" onClick={() => removeItem(idx)}>✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="strong">Spolu bez DPH</td>
                  <td className="num strong">{fmtMoney(subtotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
            <p className="muted" style={{ margin: '8px 0 0' }}>
              DPH a celková suma sa dopočítajú pri vystavení. PDF sa uloží na Shared Drive.
              {reverseChargeHint && (
                <> {' '}Zákazník má zahraničné IČ DPH — faktúra bude vystavená bez DPH (reverse charge).</>
              )}
            </p>
          </div>
        </div>
      )}
    </Modal>
  )
}

export { TYPE_LABELS }
