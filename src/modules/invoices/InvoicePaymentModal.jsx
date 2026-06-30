import { useState } from 'react'
import { apiCall } from '../../api/client'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { fmtMoney, parseNum, toIsoDate } from '../../utils/format'

export default function InvoicePaymentModal({ invoice, onClose, onSaved, payRemaining }) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const remaining = payRemaining != null
    ? payRemaining
    : parseNum(invoice.remainingNet ?? invoice.amountNet ?? invoice.amount)
  const [amount, setAmount] = useState(remaining > 0.005 ? String(Math.round(remaining * 100) / 100) : '')
  const [paidDate, setPaidDate] = useState(toIsoDate(new Date().toISOString()))
  const [notes, setNotes] = useState('')

  const save = async () => {
    const amt = parseNum(amount)
    if (!amt || amt <= 0) {
      toast('Zadajte sumu úhrady', 'err')
      return
    }
    if (remaining > 0.005 && amt > remaining + 0.01) {
      toast('Suma prekračuje zvyšok na faktúre (' + fmtMoney(remaining) + ')', 'err')
      return
    }
    setSaving(true)
    try {
      await apiCall('addInvoicePayment', {
        invoiceId: invoice.id,
        amountNet: amt,
        paidDate,
        notes,
      })
      toast('Úhrada zaznamenaná')
      onSaved()
    } catch (e) {
      toast('Nepodarilo sa uložiť: ' + e.message, 'err')
      setSaving(false)
    }
  }

  const title = payRemaining != null && Math.abs(payRemaining - remaining) < 0.02
    ? 'Uhradiť zvyšok faktúry'
    : 'Pridať úhradu k faktúre'

  return (
    <Modal
      title={title + (invoice.number ? ' ' + invoice.number : '')}
      onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Ukladá sa…' : 'Uložiť úhradu'}</button>
      </>}
    >
      <div className="form-grid">
        <label className="field">
          <span>Suma bez DPH (€)</span>
          <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
          {remaining > 0.005 && <span className="muted" style={{ fontSize: '0.85em' }}>Zvyšok: {fmtMoney(remaining)}</span>}
        </label>
        <label className="field">
          <span>Dátum platby</span>
          <input type="date" value={paidDate} max={toIsoDate(new Date().toISOString())} onChange={e => setPaidDate(e.target.value)} />
        </label>
        <label className="field span-2">
          <span>Poznámka</span>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Voliteľné" />
        </label>
      </div>
    </Modal>
  )
}
