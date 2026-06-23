import { useState } from 'react'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { apiCall } from '../../api/client'
import { fmtMoney, fmtDate, parseNum } from '../../utils/format'
import CreateIssuedInvoiceForm from '../invoices/CreateIssuedInvoiceForm'

// Ručné pridávanie nákladov a faktúr ku konkrétnemu projektu (zadanie 6.4.3).

export function MaterialForm({ project, item, onClose, onSaved }) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const editing = !!item
  const [f, setF] = useState({
    name: item?.name || '',
    amount: item?.amount ?? '',
    category: item?.category || '',
    notes: item?.notes || '',
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const save = async () => {
    if (!f.name.trim() || f.amount === '') { toast('Vyplňte názov a sumu', 'err'); return }
    setSaving(true)
    try {
      const row = {
        ...(editing ? { id: item.id } : {}),
        projectId: project.id,
        name: f.name.trim(),
        amount: parseNum(f.amount),
        category: f.category.trim(),
        notes: f.notes,
      }
      await apiCall(editing ? 'updateMaterialItem' : 'addMaterialItem', { item: row })
      toast(editing ? 'Materiál upravený' : 'Materiál pridaný')
      onSaved()
    } catch (e) {
      toast('Nepodarilo sa uložiť: ' + e.message, 'err')
      setSaving(false)
    }
  }

  return (
    <Modal title={(editing ? 'Upraviť materiál' : 'Pridať materiál') + ' — ' + project.name} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Ukladá sa…' : 'Uložiť'}</button>
      </>}>
      <div className="form-grid">
        <label className="field span-2"><span>Položka *</span><input value={f.name} onChange={set('name')} placeholder="napr. Dub foršne 0,5 m³" /></label>
        <label className="field"><span>Suma (€) *</span><input type="number" value={f.amount} onChange={set('amount')} /></label>
        <label className="field"><span>Kategória</span><input value={f.category} onChange={set('category')} placeholder="napr. Rezivo" /></label>
        <label className="field span-2"><span>Poznámky</span><textarea rows={2} value={f.notes} onChange={set('notes')} /></label>
      </div>
    </Modal>
  )
}

export function IncomingInvoiceForm({ project, onClose, onSaved }) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    vendor: '', invoiceNumber: '', amountNet: '', vat: '', amountGross: '',
    issueDate: '', dueDate: '', variableSymbol: '', category: '', status: 'Nezaplatená', notes: '',
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const save = async () => {
    if (!f.vendor.trim() || f.amountGross === '') { toast('Vyplňte dodávateľa a sumu s DPH', 'err'); return }
    setSaving(true)
    try {
      await apiCall('addIncomingInvoice', {
        invoice: {
          vendor: f.vendor.trim(),
          invoiceNumber: f.invoiceNumber.trim(),
          amountNet: f.amountNet === '' ? '' : parseNum(f.amountNet),
          vat: f.vat === '' ? '' : parseNum(f.vat),
          amountGross: parseNum(f.amountGross),
          issueDate: f.issueDate,
          dueDate: f.dueDate,
          variableSymbol: f.variableSymbol.trim(),
          category: f.category.trim(),
          projectId: project.id,
          projectName: project.name,
          driveLink: '',
          status: f.status,
          processedAt: new Date().toISOString(),
          emailId: '',
          notes: f.notes,
        },
      })
      toast('Prijatá faktúra pridaná')
      onSaved()
    } catch (e) {
      toast('Nepodarilo sa uložiť: ' + e.message, 'err')
      setSaving(false)
    }
  }

  return (
    <Modal title={'Prijatá faktúra — ' + project.name} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Ukladá sa…' : 'Uložiť'}</button>
      </>}>
      <div className="form-grid">
        <label className="field span-2"><span>Dodávateľ *</span><input value={f.vendor} onChange={set('vendor')} /></label>
        <label className="field"><span>Číslo faktúry</span><input value={f.invoiceNumber} onChange={set('invoiceNumber')} /></label>
        <label className="field"><span>Variabilný symbol</span><input value={f.variableSymbol} onChange={set('variableSymbol')} /></label>
        <label className="field"><span>Suma bez DPH (€)</span><input type="number" value={f.amountNet} onChange={set('amountNet')} /></label>
        <label className="field"><span>DPH (€)</span><input type="number" value={f.vat} onChange={set('vat')} /></label>
        <label className="field"><span>Suma s DPH (€) *</span><input type="number" value={f.amountGross} onChange={set('amountGross')} /></label>
        <label className="field"><span>Kategória</span><input value={f.category} onChange={set('category')} /></label>
        <label className="field"><span>Vystavená</span><input type="date" value={f.issueDate} onChange={set('issueDate')} /></label>
        <label className="field"><span>Splatnosť</span><input type="date" value={f.dueDate} onChange={set('dueDate')} /></label>
        <label className="field"><span>Stav</span>
          <select value={f.status} onChange={set('status')}>
            <option>Nezaplatená</option><option>Zaplatená</option>
          </select>
        </label>
        <label className="field span-2"><span>Poznámky</span><textarea rows={2} value={f.notes} onChange={set('notes')} /></label>
      </div>
    </Modal>
  )
}

export function IssuedInvoiceForm({ project, onClose, onSaved }) {
  return (
    <CreateIssuedInvoiceForm project={project} onClose={onClose} onSaved={onSaved} />
  )
}

// Priradenie už existujúcej (nepriradenej) prijatej faktúry k projektu
export function AssignInvoiceModal({ project, incoming, onClose, onSaved }) {
  const toast = useToast()
  const [busy, setBusy] = useState(null)
  const unassigned = incoming.filter(i => !i.projectId)

  const assign = async (inv) => {
    setBusy(inv.id)
    try {
      await apiCall('updateIncomingInvoice', {
        invoice: { id: inv.id, projectId: project.id, projectName: project.name },
      })
      toast('Faktúra priradená k projektu')
      onSaved()
    } catch (e) {
      toast('Nepodarilo sa priradiť: ' + e.message, 'err')
      setBusy(null)
    }
  }

  return (
    <Modal title={'Priradiť prijatú faktúru — ' + project.name} onClose={onClose} wide>
      {unassigned.length === 0 ? (
        <p className="muted">Všetky prijaté faktúry už sú priradené k projektom.</p>
      ) : (
        <table className="table">
          <thead><tr><th>Dodávateľ</th><th>Číslo</th><th>Vystavená</th><th className="num">Suma</th><th /></tr></thead>
          <tbody>
            {unassigned.map(i => (
              <tr key={i.id}>
                <td>{i.vendor}</td>
                <td>{i.invoiceNumber}</td>
                <td>{fmtDate(i.issueDate)}</td>
                <td className="num">{fmtMoney(i.amountGross)}</td>
                <td className="num">
                  <button className="btn btn-sm" disabled={busy === i.id} onClick={() => assign(i)}>
                    {busy === i.id ? '…' : 'Priradiť'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  )
}
