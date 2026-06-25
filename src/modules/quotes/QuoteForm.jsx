import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { useToast } from '../../components/Toast'
import { Spinner } from '../../components/ui'
import { fmtMoney, parseNum, toIsoDate } from '../../utils/format'
import {
  QUOTE_STATUSES, QUOTE_LANGUAGES, QUOTE_TAX_MODES, QUOTE_TERMS_TEMPLATES,
  QUOTE_UNITS, emptyQuoteItem, translateTargetLang,
} from './quoteConstants'

function isForeignVatCustomer(customer) {
  const vatId = String(customer?.vatId || '').trim().toUpperCase().replace(/\s/g, '')
  if (!vatId || vatId.length < 3) return false
  return /^[A-Z]{2}/.test(vatId) && !vatId.startsWith('SK')
}

export default function QuoteForm({ quoteId, initialCustomerId, initialLeadId, onSaved, onCancel }) {
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isEdit = !!quoteId
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState([])
  const [deals, setDeals] = useState([])
  const [previewNumber, setPreviewNumber] = useState('')
  const [frozen, setFrozen] = useState(false)

  const [f, setF] = useState({
    customerId: initialCustomerId || searchParams.get('customerId') || '',
    leadId: initialLeadId || searchParams.get('leadId') || '',
    projectName: '',
    issueDate: toIsoDate(new Date().toISOString()),
    validityDays: '30',
    language: 'SK',
    taxMode: 'VAT_SK',
    taxLegalNote: '',
    status: 'koncept',
    paymentTerms: '',
    termsTemplate: 'kratka',
    termsBody: '',
    notes: '',
    items: [emptyQuoteItem()],
  })

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  useEffect(() => {
    Promise.all([
      apiCall('getCustomers'),
      apiCall('previewNextQuoteNumber', { issueDate: f.issueDate }),
    ]).then(([custs, prev]) => {
      setCustomers(custs || [])
      setPreviewNumber(prev.quoteNumber || '')
    }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    apiCall('previewNextQuoteNumber', { issueDate: f.issueDate })
      .then(d => setPreviewNumber(d.quoteNumber || ''))
      .catch(() => {})
  }, [f.issueDate])

  useEffect(() => {
    if (!f.customerId) { setDeals([]); return }
    apiCall('getDeals', { customerId: f.customerId })
      .then(d => setDeals(Array.isArray(d) ? d : d.deals || []))
      .catch(() => setDeals([]))
  }, [f.customerId])

  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    apiCall('getQuote', { id: quoteId })
      .then(data => {
        const q = data.quote
        setFrozen(!!q.isFrozen)
        setF({
          customerId: q.customerId,
          leadId: q.leadId || '',
          projectName: q.projectName || '',
          issueDate: toIsoDate(q.issueDate) || f.issueDate,
          validityDays: q.validityDays || '30',
          language: q.language || 'SK',
          taxMode: q.taxMode || 'VAT_SK',
          taxLegalNote: q.taxLegalNote || '',
          status: q.status || 'koncept',
          paymentTerms: q.paymentTerms || '',
          termsTemplate: q.termsTemplate || 'kratka',
          termsBody: q.termsBody || '',
          notes: q.notes || '',
          items: (data.items || []).length
            ? data.items.map(it => ({
              descPrimary: it.descPrimary || '',
              descSecondary: it.descSecondary || '',
              descDetail: it.descDetail || '',
              quantity: it.quantity || '',
              unit: it.unit || 'ks',
              unitPriceNet: it.unitPriceNet || '',
              linePriceNet: it.linePriceNet || '',
            }))
            : [emptyQuoteItem()],
        })
      })
      .catch(e => toast(e.message, 'err'))
      .finally(() => setLoading(false))
  }, [quoteId, isEdit]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!f.customerId || isEdit) return
    apiCall('suggestQuoteTaxMode', { customerId: f.customerId })
      .then(d => setF(prev => ({
        ...prev,
        taxMode: d.taxMode || prev.taxMode,
        taxLegalNote: d.taxLegalNote || prev.taxLegalNote,
      })))
      .catch(() => {})
  }, [f.customerId, isEdit])

  const selectedCustomer = customers.find(c => c.id === f.customerId)
  const reverseHint = isForeignVatCustomer(selectedCustomer)

  const setItem = (idx, k, val) => {
    const items = f.items.map((it, i) => (i === idx ? { ...it, [k]: val } : it))
    setF({ ...f, items })
  }

  const lineNet = (it) => {
    const line = parseNum(it.linePriceNet)
    if (line > 0 && !String(it.quantity || '').trim()) return line
    const qty = parseNum(it.quantity) || 0
    const price = parseNum(it.unitPriceNet) || 0
    if (qty > 0) return Math.round(qty * price * 100) / 100
    return price
  }

  const subtotalNet = useMemo(
    () => f.items.reduce((s, it) => s + lineNet(it), 0),
    [f.items]
  )

  const vatRate = 23
  const subtotalGross = f.taxMode === 'REVERSE_CHARGE'
    ? subtotalNet
    : Math.round(subtotalNet * (1 + vatRate / 100) * 100) / 100

  const translateItem = async (idx) => {
    const lang = translateTargetLang(f.language)
    if (!lang) { toast('Preklad je dostupný pri jazyku SK+DE alebo SK+EN', 'err'); return }
    const text = f.items[idx].descPrimary
    if (!text.trim()) { toast('Vyplňte slovenský popis', 'err'); return }
    try {
      const res = await apiCall('translateText', { text, targetLang: lang })
      const t = res.translations?.[0] || res.raw || ''
      setItem(idx, 'descSecondary', t)
      toast('Návrh prekladu vložený — upravte podľa potreby')
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  const translateTerms = async () => {
    const lang = translateTargetLang(f.language)
    if (!lang) { toast('Preklad je dostupný pri jazyku SK+DE alebo SK+EN', 'err'); return }
    if (!f.termsBody.trim()) { toast('Vyplňte podmienky', 'err'); return }
    try {
      const res = await apiCall('translateText', { texts: [f.termsBody], targetLang: lang })
      const t = res.translations?.[0] || ''
      setF({ ...f, termsBody: f.termsBody + '\n\n' + t })
      toast('Preklad pripojený — upravte podľa potreby')
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  const save = async () => {
    if (frozen) { toast('Ponuka je uzamknutá', 'err'); return }
    if (!f.customerId) { toast('Vyberte zákazníka', 'err'); return }
    if (!f.projectName.trim()) { toast('Vyplňte názov projektu', 'err'); return }
    const items = f.items.map(it => ({
      descPrimary: it.descPrimary.trim(),
      descSecondary: it.descSecondary.trim(),
      descDetail: it.descDetail.trim(),
      quantity: String(it.quantity || '').trim(),
      unit: it.unit || '',
      unitPriceNet: String(it.unitPriceNet || '').trim(),
      linePriceNet: String(it.linePriceNet || '').trim(),
    }))
    if (items.some(it => !it.descPrimary)) {
      toast('Vyplňte popis všetkých položiek', 'err')
      return
    }
    if (items.some(it => lineNet(it) <= 0)) {
      toast('Vyplňte cenu položiek', 'err')
      return
    }
    setSaving(true)
    try {
      const quote = {
        ...(isEdit ? { id: quoteId } : {}),
        customerId: f.customerId,
        leadId: f.leadId,
        projectName: f.projectName.trim(),
        issueDate: f.issueDate,
        validityDays: f.validityDays,
        language: f.language,
        taxMode: f.taxMode,
        taxLegalNote: f.taxLegalNote,
        status: f.status,
        paymentTerms: f.paymentTerms,
        termsTemplate: f.termsTemplate,
        termsBody: f.termsBody,
        notes: f.notes,
        items,
      }
      const res = isEdit
        ? await apiCall('updateQuote', { quote })
        : await apiCall('addQuote', { quote })
      toast(isEdit ? 'Ponuka uložená' : 'Ponuka vytvorená — ' + (res.quote?.quoteNumber || ''))
      if (onSaved) onSaved(res)
      else navigate('/zakaznici/ponuky/' + (res.quote?.id || quoteId))
    } catch (e) {
      toast('Nepodarilo sa uložiť: ' + e.message, 'err')
      setSaving(false)
    }
  }

  if (loading) return <Spinner label="Načítava sa…" />

  return (
    <div className="card">
      {frozen && (
        <p className="muted" style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--surface-2, #f5f5f5)', borderRadius: 6 }}>
          Ponuka je uzamknutá (prijatá alebo prepojená s projektom) — úpravy nie sú možné.
        </p>
      )}
      <div className="form-grid">
        {!isEdit && (
          <label className="field">
            <span>Číslo ponuky (orientačné)</span>
            <input readOnly className="readonly" value={previewNumber} />
            <span className="muted" style={{ fontSize: '0.85em' }}>Presné číslo CP sa pridelí pri uložení.</span>
          </label>
        )}
        <label className="field">
          <span>Stav</span>
          <select value={f.status} onChange={set('status')} disabled={frozen}>
            {QUOTE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label className="field span-2">
          <span>Zákazník *</span>
          <select value={f.customerId} onChange={set('customerId')} disabled={frozen || isEdit}>
            <option value="">— Vyberte —</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.company}
              </option>
            ))}
          </select>
        </label>
        <label className="field span-2">
          <span>Dopyt (voliteľné)</span>
          <select value={f.leadId} onChange={set('leadId')} disabled={frozen}>
            <option value="">— Bez dopytu —</option>
            {deals.map(d => <option key={d.id} value={d.id}>{d.title || d.id}</option>)}
          </select>
        </label>
        <label className="field span-2">
          <span>Názov projektu na ponuke *</span>
          <input value={f.projectName} onChange={set('projectName')} disabled={frozen} />
        </label>
        <label className="field">
          <span>Dátum vystavenia</span>
          <input type="date" value={f.issueDate} onChange={set('issueDate')} disabled={frozen} />
        </label>
        <label className="field">
          <span>Platnosť (dní)</span>
          <input type="number" min="1" value={f.validityDays} onChange={set('validityDays')} disabled={frozen} />
        </label>
        <label className="field">
          <span>Jazyk</span>
          <select value={f.language} onChange={set('language')} disabled={frozen}>
            {QUOTE_LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Daňový režim</span>
          <select value={f.taxMode} onChange={set('taxMode')} disabled={frozen}>
            {QUOTE_TAX_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          {reverseHint && f.taxMode === 'VAT_SK' && (
            <span className="muted" style={{ fontSize: '0.85em' }}>Zákazník má zahraničné IČ DPH — zvážte reverse charge.</span>
          )}
        </label>
        <label className="field span-2">
          <span>Právna doložka (DPH)</span>
          <textarea rows={2} value={f.taxLegalNote} onChange={set('taxLegalNote')} disabled={frozen} />
        </label>
        <label className="field span-2">
          <span>Platobné podmienky</span>
          <textarea rows={2} value={f.paymentTerms} onChange={set('paymentTerms')} disabled={frozen} />
        </label>
        <label className="field">
          <span>Šablóna podmienok</span>
          <select value={f.termsTemplate} onChange={set('termsTemplate')} disabled={frozen}>
            {QUOTE_TERMS_TEMPLATES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <label className="field span-2">
          <span>Text podmienok (strana 2)</span>
          <textarea rows={4} value={f.termsBody} onChange={set('termsBody')} disabled={frozen} />
          {!frozen && translateTargetLang(f.language) && (
            <button type="button" className="btn btn-sm btn-secondary" style={{ marginTop: 6 }} onClick={translateTerms}>
              Preložiť podmienky do {translateTargetLang(f.language)}
            </button>
          )}
        </label>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="card-head" style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Položky</h3>
          {!frozen && (
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setF({ ...f, items: [...f.items, emptyQuoteItem()] })}>
              + Položka
            </button>
          )}
        </div>
        <table className="table table-compact">
          <thead>
            <tr>
              <th>Popis SK</th>
              <th>Popis DE/EN</th>
              <th>Množ.</th>
              <th>MJ</th>
              <th className="num">Cena/MJ</th>
              <th className="num">Paušál</th>
              <th className="num">Netto</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {f.items.map((it, idx) => (
              <tr key={idx}>
                <td><input value={it.descPrimary} onChange={e => setItem(idx, 'descPrimary', e.target.value)} disabled={frozen} /></td>
                <td>
                  <input value={it.descSecondary} onChange={e => setItem(idx, 'descSecondary', e.target.value)} disabled={frozen} />
                  {!frozen && translateTargetLang(f.language) && (
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => translateItem(idx)}>Preložiť</button>
                  )}
                </td>
                <td><input value={it.quantity} onChange={e => setItem(idx, 'quantity', e.target.value)} disabled={frozen} style={{ width: 56 }} /></td>
                <td>
                  <select value={it.unit} onChange={e => setItem(idx, 'unit', e.target.value)} disabled={frozen}>
                    {QUOTE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </td>
                <td className="num"><input value={it.unitPriceNet} onChange={e => setItem(idx, 'unitPriceNet', e.target.value)} disabled={frozen} style={{ width: 80 }} /></td>
                <td className="num"><input value={it.linePriceNet} onChange={e => setItem(idx, 'linePriceNet', e.target.value)} disabled={frozen} style={{ width: 80 }} placeholder="paušál" /></td>
                <td className="num">{fmtMoney(lineNet(it))}</td>
                <td>
                  {!frozen && f.items.length > 1 && (
                    <button type="button" className="icon-btn" onClick={() => setF({ ...f, items: f.items.filter((_, i) => i !== idx) })}>✕</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6} className="strong">Spolu {f.taxMode === 'REVERSE_CHARGE' ? 'bez DPH' : 's DPH'}</td>
              <td className="num strong">{fmtMoney(f.taxMode === 'REVERSE_CHARGE' ? subtotalNet : subtotalGross)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <label className="field span-2" style={{ marginTop: 12, display: 'block' }}>
        <span>Interná poznámka</span>
        <textarea rows={2} value={f.notes} onChange={set('notes')} disabled={frozen} />
      </label>

      <div className="btn-group" style={{ marginTop: 16 }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel || (() => navigate('/zakaznici/ponuky'))}>Späť</button>
        {!frozen && (
          <button type="button" className="btn" onClick={save} disabled={saving}>
            {saving ? 'Ukladá sa…' : (isEdit ? 'Uložiť ponuku' : 'Vytvoriť ponuku')}
          </button>
        )}
      </div>
    </div>
  )
}
