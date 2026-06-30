import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import { StatusBadge } from '../../components/ui'
import { fmtDate, fmtMoney, fmtPercent } from '../../utils/format'
import {
  DEAL_PHASES, LOST_REASONS, STALE_DAYS, sourceLabel,
  canConvertDealToProject, quoteLinkStatusLabel, QUOTE_LINK_STATUSES,
} from './crmConstants'
import { quoteStatusLabel } from '../quotes/quoteConstants'
import SalesOwnerSelect from './SalesOwnerSelect'
import ProjectEvaluationSection from '../projects/ProjectEvaluationSection'

export default function DealDetailModal({ dealId, onClose, onUpdated }) {
  const toast = useToast()
  const navigate = useNavigate()
  const { can } = useAuth()
  const canWriteProject = can('perm_projects_write')
  const canSeeCosts = can('perm_costs_add') || can('perm_costs_full')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState(null)
  const [phaseForm, setPhaseForm] = useState({ phase: 'novy_dopyt', lostReason: 'cena', lostReasonOther: '', ownerEmail: '', estimatedValue: '' })
  const [quoteForm, setQuoteForm] = useState({ title: '', link: '', status: 'koncept' })

  const load = async () => {
    setLoading(true)
    try {
      const page = await apiCall('getDealDetail', { id: dealId, staleDays: STALE_DAYS })
      setData(page)
      setPhaseForm({
        phase: page.deal.phase || 'novy_dopyt',
        lostReason: page.deal.lostReason || 'cena',
        lostReasonOther: page.deal.lostReasonOther || '',
        ownerEmail: page.deal.ownerEmail || '',
        estimatedValue: page.deal.estimatedValue ?? '',
      })
    } catch (e) {
      toast(e.message, 'err')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [dealId]) // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = async () => {
    await load()
    onUpdated?.()
  }

  const movePhase = async () => {
    setSaving(true)
    try {
      const res = await apiCall('moveDealPhase', { id: dealId, phase: phaseForm.phase })
      if (res.warning) toast(res.warning)
      toast('Fáza uložená')
      await refresh()
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setSaving(false)
    }
  }

  const saveOwner = async () => {
    setSaving(true)
    try {
      await apiCall('updateDeal', { deal: { id: dealId, ownerEmail: phaseForm.ownerEmail } })
      toast('Obchodník uložený')
      await refresh()
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setSaving(false)
    }
  }

  const saveEstimatedValue = async () => {
    setSaving(true)
    try {
      await apiCall('updateDeal', { deal: { id: dealId, estimatedValue: phaseForm.estimatedValue } })
      toast('Hodnota uložená')
      await refresh()
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setSaving(false)
    }
  }

  const markLost = async () => {
    setSaving(true)
    try {
      await apiCall('moveDealPhase', {
        id: dealId,
        status: 'prehrate',
        lostReason: phaseForm.lostReason,
        lostReasonOther: phaseForm.lostReasonOther,
      })
      toast('Dopyt označený ako prehraný')
      await refresh()
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setSaving(false)
    }
  }

  const convertToProject = async () => {
    if (!window.confirm('Vytvoriť projekt v IS z tohto dopytu? Dopyt sa prepojí s projektom vo fáze Príprava. Po-predaj (uzavreté) nastaví až odovzdanie projektu.')) return
    setSaving(true)
    try {
      const res = await apiCall('convertDealToProject', { dealId })
      if (res.driveWarning) toast('Projekt vytvorený, Drive: ' + res.driveWarning, 'err')
      else toast('Projekt ' + res.projectId + ' vytvorený')
      onClose()
      navigate('/projekty/' + res.projectId)
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setSaving(false)
    }
  }

  const uploadQuotePdf = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!quoteForm.title.trim()) {
      toast('Najprv vyplňte názov ponuky', 'err')
      e.target.value = ''
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast('Súbor je príliš veľký (max. 10 MB)', 'err')
      e.target.value = ''
      return
    }
    setSaving(true)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      await apiCall('uploadQuotePdf', {
        customerId: data.deal.customerId,
        dealId,
        title: quoteForm.title.trim(),
        status: quoteForm.status,
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        base64,
      })
      toast('Ponuka nahraná na Drive')
      setQuoteForm({ title: '', link: '', status: 'koncept' })
      await refresh()
    } catch (err) {
      toast(err.message, 'err')
    } finally {
      setSaving(false)
      e.target.value = ''
    }
  }

  const addQuote = async () => {
    if (!quoteForm.title.trim() || !quoteForm.link.trim()) {
      toast('Vyplňte názov a odkaz ponuky', 'err')
      return
    }
    setSaving(true)
    try {
      await apiCall('addQuoteLink', {
        quoteLink: {
          ...quoteForm,
          customerId: data.deal.customerId,
          dealId,
        },
      })
      toast('Ponuka pridaná')
      setQuoteForm({ title: '', link: '', status: 'koncept' })
      await refresh()
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setSaving(false)
    }
  }

  const deleteQuote = async (id) => {
    if (!window.confirm('Odstrániť odkaz na ponuku?')) return
    try {
      await apiCall('deleteQuoteLink', { id })
      toast('Ponuka odstránená')
      await refresh()
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  if (loading || !data) {
    return (
      <Modal title="Dopyt" onClose={onClose}>
        <p className="muted">Načítava sa…</p>
      </Modal>
    )
  }

  const { deal, quotes = [], quoteLinks, project, summary, evaluation, paymentSummary, invoices } = data
  const showConvert = canWriteProject && canConvertDealToProject(deal)

  const quoteAmount = (q) => {
    if (q.taxMode === 'REVERSE_CHARGE') return fmtMoney(q.totalNet)
    return fmtMoney(q.totalGross || q.totalNet)
  }

  return (
    <Modal title={deal.title || deal.id} onClose={onClose} wide
      footer={<button className="btn btn-secondary" onClick={onClose}>Zavrieť</button>}>
      <p className="muted" style={{ marginBottom: 12 }}>
        <Link to={'/zakaznici/' + deal.customerId}>{deal.customerName}</Link>
        {' · '}{deal.id}
        {deal.stale && <span className="kanban-stale-badge" style={{ marginLeft: 8 }}>Bez aktivity {deal.daysSinceActivity}+ dní</span>}
      </p>

      <div className="form-grid">
        <label className="field"><span>Fáza</span>
          <select value={phaseForm.phase} onChange={e => setPhaseForm({ ...phaseForm, phase: e.target.value })} disabled={saving}>
            {DEAL_PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
        <label className="field"><span>Obchodník</span>
          <SalesOwnerSelect
            value={phaseForm.ownerEmail}
            onChange={v => setPhaseForm({ ...phaseForm, ownerEmail: v })}
            disabled={saving}
          />
        </label>
        <label className="field"><span>Zdroj</span>
          <input disabled value={sourceLabel(deal.source)} />
        </label>
        <label className="field"><span>Hodnota (€)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={phaseForm.estimatedValue}
            onChange={e => setPhaseForm({ ...phaseForm, estimatedValue: e.target.value })}
            disabled={saving}
            placeholder="Odhadovaná suma"
          />
        </label>
        <label className="field"><span>Vážená hodnota</span>
          <input disabled value={deal.weightedValue ? fmtMoney(deal.weightedValue) : '—'} />
        </label>
      </div>

      <div className="btn-group" style={{ marginTop: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-sm" onClick={movePhase} disabled={saving}>Uložiť fázu</button>
        <button className="btn btn-sm btn-secondary" onClick={saveOwner} disabled={saving}>Uložiť obchodníka</button>
        <button className="btn btn-sm btn-secondary" onClick={saveEstimatedValue} disabled={saving}>Uložiť hodnotu</button>
        <button className="btn btn-sm btn-secondary" onClick={markLost} disabled={saving || deal.status === 'prehrate'}>Prehrané</button>
        {showConvert && (
          <button className="btn btn-sm" onClick={convertToProject} disabled={saving}>Vytvoriť projekt</button>
        )}
      </div>

      {deal.status === 'prehrate' && (
        <div className="form-grid" style={{ marginTop: 14 }}>
          <label className="field span-2"><span>Dôvod prehry</span>
            <select value={phaseForm.lostReason} onChange={e => setPhaseForm({ ...phaseForm, lostReason: e.target.value })}>
              {LOST_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </label>
        </div>
      )}

      {project && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3 style={{ marginBottom: 8 }}>Projekt (IS)</h3>
          <p>
            <Link to={'/projekty/' + project.id} className="project-id">{project.id}</Link>
            {' — '}{project.name}
            {' '}<StatusBadge status={project.status} />
          </p>
          {summary && canSeeCosts && (
            <div className="detail-grid" style={{ marginTop: 10 }}>
              <div><span className="muted">Náklady</span><div>{fmtMoney(summary.totalCost)}</div></div>
              <div><span className="muted">Rozpočet</span><div>{summary.costPercent != null ? fmtPercent(summary.costPercent) : '—'}</div></div>
            </div>
          )}
          {paymentSummary && !canSeeCosts && (
            <div className="detail-grid" style={{ marginTop: 10 }}>
              <div><span className="muted">Uhradené</span><div>{fmtMoney(paymentSummary.paidNet)}</div></div>
              <div><span className="muted">Zostáva</span><div>{fmtMoney(paymentSummary.remainingNet)}</div></div>
            </div>
          )}
          {evaluation && String(project.status) === 'odovzdany' && (
            <div style={{ marginTop: 12 }}>
              <ProjectEvaluationSection evaluation={evaluation} canSeeCosts={canSeeCosts} embedded />
            </div>
          )}
          {project.driveFolderUrl && (
            <p style={{ marginTop: 8 }}>
              <a href={project.driveFolderUrl} target="_blank" rel="noreferrer">Priečinok projektu na Drive</a>
            </p>
          )}
          {invoices.length > 0 && (
            <table className="table" style={{ marginTop: 12 }}>
              <thead><tr><th>Faktúra</th><th>Suma</th><th>Stav</th></tr></thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td>{inv.number || inv.id}</td>
                    <td className="num">{fmtMoney(inv.amountNet || inv.amount)}</td>
                    <td>{inv.status || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ marginBottom: 8 }}>Ponuky</h3>
        <div className="btn-group" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => navigate('/zakaznici/ponuky/nova?customerId=' + encodeURIComponent(deal.customerId) + '&leadId=' + encodeURIComponent(dealId))}
          >
            + Vytvoriť cenovú ponuku
          </button>
        </div>
        {quotes.length === 0 ? (
          <p className="muted">Zatiaľ žiadna ponuka v systéme.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>CP číslo</th>
                <th>Projekt</th>
                <th>Stav</th>
                <th className="num">Suma</th>
                <th>PDF</th>
                <th>Poznámka</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(q => (
                <tr
                  key={q.id}
                  className="clickable"
                  onClick={() => navigate('/zakaznici/ponuky/' + q.id)}
                >
                  <td>
                    <Link to={'/zakaznici/ponuky/' + q.id} onClick={e => e.stopPropagation()}>
                      {q.quoteNumber || q.id}
                    </Link>
                  </td>
                  <td>{q.projectName || '—'}</td>
                  <td>{quoteStatusLabel(q.status)}</td>
                  <td className="num">{quoteAmount(q)}</td>
                  <td>
                    {q.pdfUrl ? (
                      <a href={q.pdfUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>PDF</a>
                    ) : '—'}
                  </td>
                  <td>
                    {q.isExpired && <span className="kanban-stale-badge">Expirovaná</span>}
                    {q.pdfStale && <span className="kanban-stale-badge" style={{ marginLeft: q.isExpired ? 6 : 0 }}>PDF neaktuálne</span>}
                    {!q.isExpired && !q.pdfStale && '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <details style={{ marginTop: 16 }}>
          <summary className="muted" style={{ cursor: 'pointer' }}>Externé odkazy (staré)</summary>
          {quoteLinks.length === 0 ? (
            <p className="muted" style={{ marginTop: 8 }}>Žiadne externé odkazy.</p>
          ) : (
            <table className="table" style={{ marginTop: 8 }}>
              <thead><tr><th>Názov</th><th>Stav</th><th>Odkaz</th><th /></tr></thead>
              <tbody>
                {quoteLinks.map(q => (
                  <tr key={q.id}>
                    <td>{q.title}</td>
                    <td>{quoteLinkStatusLabel(q.status)}</td>
                    <td><a href={q.link} target="_blank" rel="noreferrer">Otvoriť</a></td>
                    <td className="row-action">
                      <button className="icon-btn" onClick={() => deleteQuote(q.id)}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="form-grid" style={{ marginTop: 12 }}>
            <label className="field"><span>Názov ponuky</span>
              <input value={quoteForm.title} onChange={e => setQuoteForm({ ...quoteForm, title: e.target.value })} />
            </label>
            <label className="field"><span>Stav</span>
              <select value={quoteForm.status} onChange={e => setQuoteForm({ ...quoteForm, status: e.target.value })}>
                {QUOTE_LINK_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
            <label className="field span-2"><span>Odkaz (URL) — voliteľné</span>
              <input value={quoteForm.link} onChange={e => setQuoteForm({ ...quoteForm, link: e.target.value })} placeholder="https://..." />
            </label>
            <label className="field span-2"><span>Nahrať PDF z disku</span>
              <input type="file" accept=".pdf,application/pdf" onChange={uploadQuotePdf} disabled={saving} />
            </label>
          </div>
          <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={addQuote} disabled={saving || !quoteForm.link.trim()}>+ Pridať odkaz</button>
        </details>
      </div>

      {(deal.clientDeadline || deal.nextActionDate) && (
        <p className="muted" style={{ marginTop: 16 }}>
          {deal.clientDeadline && <>Termín klienta: {fmtDate(deal.clientDeadline)} · </>}
          {deal.nextActionDate && <>Ďalšia akcia: {fmtDate(deal.nextActionDate)}</>}
        </p>
      )}
      {deal.notes && <p className="prewrap muted" style={{ marginTop: 8 }}>{deal.notes}</p>}
    </Modal>
  )
}
