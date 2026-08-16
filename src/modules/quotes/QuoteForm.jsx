import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { useToast } from '../../components/Toast'
import { Spinner } from '../../components/ui'
import { useAuth } from '../../auth/AuthContext'
import { fmtMoney, isUsableVatRate, parseNum, toIsoDate } from '../../utils/format'
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
  const { settings, canUseTaxCalculations } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isEdit = !!quoteId
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState([])
  const [deals, setDeals] = useState([])
  const [previewNumber, setPreviewNumber] = useState('')
  const [frozen, setFrozen] = useState(false)
  // Dvojjazyčné podmienky: default text šablóny pre aktuálny jazyk (načítané zo servera).
  const [termsDefaults, setTermsDefaults] = useState({ kratka: '', plna: '' })
  // Prebiehajúce auto-preklady polí položiek — kľúč `${idx}:${dstKey}`.
  const [translating, setTranslating] = useState({})
  // true, kým sa text podmienok zhoduje so systémovou šablónou (bezpečné automaticky prepísať).
  const termsPristineRef = useRef(true)
  const copyFromId = !isEdit ? searchParams.get('copyFrom') : ''

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
        // Načítaný text podmienok je vlastný obsah — chránime ho pred auto-prepísaním šablónou.
        termsPristineRef.current = false
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
              descDetailSecondary: it.descDetailSecondary || '',
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
    if (!copyFromId) return
    setLoading(true)
    apiCall('getQuote', { id: copyFromId })
      .then(data => {
        const q = data.quote
        // Kopírovaný text podmienok je vlastný obsah — chránime ho pred auto-prepísaním šablónou.
        termsPristineRef.current = false
        setF(prev => ({
          ...prev,
          customerId: q.customerId,
          leadId: q.leadId || '',
          projectName: q.projectName || '',
          issueDate: toIsoDate(new Date().toISOString()),
          validityDays: q.validityDays || '30',
          language: q.language || 'SK',
          taxMode: q.taxMode || 'VAT_SK',
          taxLegalNote: q.taxLegalNote || '',
          status: 'koncept',
          paymentTerms: q.paymentTerms || '',
          termsTemplate: q.termsTemplate || 'kratka',
          termsBody: q.termsBody || '',
          notes: q.notes || '',
          items: (data.items || []).length ? data.items.map(it => ({
            descPrimary: it.descPrimary || '', descSecondary: it.descSecondary || '',
            descDetail: it.descDetail || '', descDetailSecondary: it.descDetailSecondary || '',
            quantity: it.quantity || '', unit: it.unit || 'ks',
            unitPriceNet: it.unitPriceNet || '', linePriceNet: it.linePriceNet || '',
          })) : [emptyQuoteItem()],
        }))
        toast('Variant bol predvyplnený. Nové číslo dostane až pri uložení.')
      })
      .catch(e => toast(e.message, 'err'))
      .finally(() => setLoading(false))
  }, [copyFromId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Načíta default podmienky pre aktuálny jazyk + platnosť. Do poľa termsBody ich vloží len pri
  // novej ponuke a len ak text ešte nebol ručne upravený (pristine) — inak by prepísal úpravy.
  useEffect(() => {
    apiCall('getQuoteDefaults', { validityDays: f.validityDays, language: f.language })
      .then(d => {
        const defaults = { kratka: d.quoteTermsKratka || '', plna: d.quoteTermsPlna || '' }
        setTermsDefaults(defaults)
        if (isEdit) return
        setF(prev => {
          const patch = { ...prev, paymentTerms: prev.paymentTerms || d.quotePaymentTermsDefault || '' }
          if (termsPristineRef.current) patch.termsBody = defaults[prev.termsTemplate] ?? ''
          return patch
        })
      })
      .catch(() => {})
  }, [isEdit, f.language, f.validityDays])

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

  const setItem = (idx, k, val) => setF(prev => ({
    ...prev,
    items: prev.items.map((it, i) => (i === idx ? { ...it, [k]: val } : it)),
  }))

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

  const taxCalculationsReady = canUseTaxCalculations === true
    && isUsableVatRate(settings?.vatRate)
  const vatQuoteBlocked = f.taxMode === 'VAT_SK' && !taxCalculationsReady
  const subtotalGross = f.taxMode === 'REVERSE_CHARGE'
    ? subtotalNet
    : taxCalculationsReady
      ? Math.round(subtotalNet * (1 + settings.vatRate / 100) * 100) / 100
      : null

  const targetLang = translateTargetLang(f.language)

  // Jadro prekladu jedného poľa položky: srcKey (SK) → dstKey (cudzí jazyk). Nastaví indikátor.
  const runTranslate = async (idx, srcKey, dstKey) => {
    const text = String(f.items[idx]?.[srcKey] || '').trim()
    if (!text || !targetLang) return
    const key = idx + ':' + dstKey
    setTranslating(prev => ({ ...prev, [key]: true }))
    try {
      const res = await apiCall('translateText', { text, targetLang })
      const t = res.translations?.[0] || res.raw || ''
      if (t) setItem(idx, dstKey, t)
      return t
    } finally {
      setTranslating(prev => { const n = { ...prev }; delete n[key]; return n })
    }
  }

  // Manuálny preklad názvu (tlačidlo „Preložiť").
  const translateItem = async (idx) => {
    if (!targetLang) { toast('Preklad je dostupný pri jazyku SK+DE alebo SK+EN', 'err'); return }
    if (!String(f.items[idx].descPrimary || '').trim()) { toast('Vyplňte slovenský popis', 'err'); return }
    try {
      await runTranslate(idx, 'descPrimary', 'descSecondary')
      toast('Návrh prekladu vložený — upravte podľa potreby')
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  // Auto-preklad pri opustení SK poľa: prekladá LEN keď je cudzojazyčné pole ešte prázdne,
  // aby neprepísal ručnú úpravu. Tichý (bez toastu), chyby ignoruje — je to len návrh.
  const autoTranslateField = (idx, srcKey, dstKey) => {
    if (!targetLang) return
    const it = f.items[idx]
    if (!it || !String(it[srcKey] || '').trim() || String(it[dstKey] || '').trim()) return
    runTranslate(idx, srcKey, dstKey).catch(() => {})
  }

  // Preloží podmienky do striedaného formátu: každá podmienka = SK riadok + preklad pod ním
  // (bloky oddelené prázdnym riadkom). PDF potom dá odrážku len pred SK.
  const translateTerms = async () => {
    if (!targetLang) { toast('Preklad je dostupný pri jazyku SK+DE alebo SK+EN', 'err'); return }
    const raw = f.termsBody.trim()
    if (!raw) { toast('Vyplňte podmienky', 'err'); return }
    const hasBlank = /\n\s*\n/.test(raw)
    const blocks = hasBlank
      ? raw.split(/\n\s*\n/).map(b => b.split('\n').map(s => s.trim()).filter(Boolean)).filter(b => b.length)
      : raw.split('\n').map(s => s.trim()).filter(Boolean).map(l => [l])
    const skLines = blocks.map(b => b[0])
    try {
      const res = await apiCall('translateText', { texts: skLines, targetLang })
      const tr = res.translations || []
      const out = blocks.map((b, i) => (tr[i] ? b[0] + '\n' + tr[i] : b[0])).join('\n\n')
      setF({ ...f, termsBody: out })
      toast('Podmienky preložené — SK riadok a pod ním preklad')
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  // Zmena šablóny podmienok automaticky načíta jej text do poľa (aby ho používateľ prispôsobil).
  // Ak je text ručne upravený (nezhoduje sa so žiadnou šablónou), pred prepísaním sa spýtame.
  const onTermsTemplateChange = (e) => {
    const tmpl = e.target.value
    const next = termsDefaults[tmpl] ?? ''
    const cur = String(f.termsBody || '').trim()
    const known = cur === '' ||
      cur === String(termsDefaults.kratka || '').trim() ||
      cur === String(termsDefaults.plna || '').trim()
    if (!known && !window.confirm('Text podmienok je upravený. Prepísať ho vybranou šablónou?')) {
      setF(prev => ({ ...prev, termsTemplate: tmpl })) // zmeň len šablónu, text ponechaj
      return
    }
    termsPristineRef.current = true
    setF(prev => ({ ...prev, termsTemplate: tmpl, termsBody: next }))
  }

  // Poistka pri uložení: doplní preklad tam, kde je SK vyplnené a cudzojazyčný náprotivok prázdny
  // (napr. keď používateľ napísal text a rovno klikol Uložiť bez opustenia poľa). Jedna dávka.
  const backfillTranslations = async (rawItems) => {
    if (!targetLang) return rawItems
    const jobs = []
    rawItems.forEach((it, i) => {
      if (String(it.descPrimary || '').trim() && !String(it.descSecondary || '').trim()) {
        jobs.push({ i, dstKey: 'descSecondary', text: String(it.descPrimary).trim() })
      }
      if (String(it.descDetail || '').trim() && !String(it.descDetailSecondary || '').trim()) {
        jobs.push({ i, dstKey: 'descDetailSecondary', text: String(it.descDetail).trim() })
      }
    })
    if (!jobs.length) return rawItems
    const filled = rawItems.map(it => ({ ...it }))
    try {
      const res = await apiCall('translateText', { texts: jobs.map(j => j.text), targetLang })
      const translations = res.translations || []
      jobs.forEach((j, k) => { if (translations[k]) filled[j.i][j.dstKey] = translations[k] })
      setF(prev => ({ ...prev, items: filled })) // premietni aj do formulára
    } catch { /* preklad je best-effort; ak zlyhá, uložíme bez neho */ }
    return filled
  }

  const save = async () => {
    if (vatQuoteBlocked) {
      toast('Daňové nastavenia nie sú pripravené. Ponuku s DPH nie je možné uložiť.', 'err')
      return
    }
    if (frozen) { toast('Ponuka je uzamknutá', 'err'); return }
    if (!f.customerId) { toast('Vyberte zákazníka', 'err'); return }
    if (!f.projectName.trim()) { toast('Vyplňte názov projektu', 'err'); return }
    if (f.items.some(it => !String(it.descPrimary || '').trim())) {
      toast('Vyplňte popis všetkých položiek', 'err')
      return
    }
    if (f.items.some(it => lineNet(it) <= 0)) {
      toast('Vyplňte cenu položiek', 'err')
      return
    }
    setSaving(true)
    const source = await backfillTranslations(f.items)
    const items = source.map(it => ({
      descPrimary: String(it.descPrimary || '').trim(),
      descSecondary: String(it.descSecondary || '').trim(),
      descDetail: String(it.descDetail || '').trim(),
      descDetailSecondary: String(it.descDetailSecondary || '').trim(),
      quantity: String(it.quantity || '').trim(),
      unit: it.unit || '',
      unitPriceNet: String(it.unitPriceNet || '').trim(),
      linePriceNet: String(it.linePriceNet || '').trim(),
    }))
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
          <select value={f.termsTemplate} onChange={onTermsTemplateChange} disabled={frozen}>
            {QUOTE_TERMS_TEMPLATES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <label className="field span-2">
          <span>Text podmienok (strana 2 PDF, ak vyplnené)</span>
          <textarea
            rows={6}
            value={f.termsBody}
            onChange={e => { termsPristineRef.current = false; set('termsBody')(e) }}
            disabled={frozen}
          />
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
              <Fragment key={idx}>
                <tr>
                  <td>
                    <input
                      value={it.descPrimary}
                      onChange={e => setItem(idx, 'descPrimary', e.target.value)}
                      onBlur={() => autoTranslateField(idx, 'descPrimary', 'descSecondary')}
                      disabled={frozen}
                    />
                  </td>
                  <td>
                    <input value={it.descSecondary} onChange={e => setItem(idx, 'descSecondary', e.target.value)} disabled={frozen} />
                    {translating[idx + ':descSecondary'] && <span className="muted" style={{ fontSize: '0.8em' }}>prekladám…</span>}
                    {!frozen && targetLang && (
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
                <tr className="item-detail-row">
                  <td colSpan={8} style={{ paddingTop: 0 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <label className="field" style={{ margin: 0 }}>
                        <span style={{ fontSize: '0.8em' }}>Detailný popis SK (voliteľné)</span>
                        <textarea
                          rows={2}
                          value={it.descDetail}
                          onChange={e => setItem(idx, 'descDetail', e.target.value)}
                          onBlur={() => autoTranslateField(idx, 'descDetail', 'descDetailSecondary')}
                          disabled={frozen}
                        />
                      </label>
                      <label className="field" style={{ margin: 0 }}>
                        <span style={{ fontSize: '0.8em' }}>
                          Detailný popis {targetLang || 'DE/EN'} (voliteľné)
                          {translating[idx + ':descDetailSecondary'] && <span className="muted"> — prekladám…</span>}
                        </span>
                        <textarea rows={2} value={it.descDetailSecondary} onChange={e => setItem(idx, 'descDetailSecondary', e.target.value)} disabled={frozen} />
                        {!frozen && targetLang && (
                          <button type="button" className="btn btn-sm btn-ghost" style={{ marginTop: 4 }} onClick={() => runTranslate(idx, 'descDetail', 'descDetailSecondary')}>Preložiť popis</button>
                        )}
                      </label>
                    </div>
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            {vatQuoteBlocked && (
              <tr>
                <td colSpan={8} id="quote-tax-configuration-error" className="budget-label-warn">
                  Daňové nastavenia nie sú pripravené. Ponuku s DPH nie je možné uložiť. Kontaktujte správcu.
                </td>
              </tr>
            )}
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
          <button
            type="button"
            className="btn"
            onClick={save}
            disabled={saving || vatQuoteBlocked}
            title={vatQuoteBlocked ? 'Najprv treba doplniť platnú daňovú konfiguráciu.' : undefined}
            aria-describedby={vatQuoteBlocked ? 'quote-tax-configuration-error' : undefined}
          >
            {saving ? 'Ukladá sa…' : (isEdit ? 'Uložiť ponuku' : 'Vytvoriť ponuku')}
          </button>
        )}
      </div>
    </div>
  )
}
