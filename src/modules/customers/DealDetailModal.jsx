import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import { StatusBadge } from '../../components/ui'
import { fmtDate, fmtMoney, fmtPercent } from '../../utils/format'
import {
  DEAL_PHASES, LOST_REASONS, STALE_DAYS, sourceLabel,
  canConvertDealToProject, quoteStatusLabel, QUOTE_LINK_STATUSES,
} from './crmConstants'

export default function DealDetailModal({ dealId, onClose, onUpdated }) {
  const toast = useToast()
  const { can } = useAuth()
  const canWriteProject = can('perm_projects_write')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState(null)
  const [phaseForm, setPhaseForm] = useState({ phase: 'novy_dopyt', lostReason: 'cena', lostReasonOther: '' })
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

  const markWon = async () => {
    setSaving(true)
    try {
      await apiCall('moveDealPhase', { id: dealId, status: 'vyhrate', phase: phaseForm.phase })
      toast('Dopyt označený ako vyhraný')
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
    if (!window.confirm('Vytvoriť projekt v IS z tohto dopytu? Dopyt sa označí ako vyhraný a prepojí s projektom.')) return
    setSaving(true)
    try {
      const res = await apiCall('convertDealToProject', { dealId })
      if (res.driveWarning) toast('Projekt vytvorený, Drive: ' + res.driveWarning, 'err')
      else toast('Projekt ' + res.projectId + ' vytvorený')
      await refresh()
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setSaving(false)
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

  const { deal, quoteLinks, project, summary, invoices } = data
  const showConvert = canWriteProject && canConvertDealToProject(deal)

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
        <label className="field"><span>Zdroj</span>
          <input disabled value={sourceLabel(deal.source)} />
        </label>
        <label className="field"><span>Hodnota</span>
          <input disabled value={deal.estimatedValue ? fmtMoney(deal.estimatedValue) : '—'} />
        </label>
        <label className="field"><span>Vážená hodnota</span>
          <input disabled value={deal.weightedValue ? fmtMoney(deal.weightedValue) : '—'} />
        </label>
      </div>

      <div className="btn-group" style={{ marginTop: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-sm" onClick={movePhase} disabled={saving}>Uložiť fázu</button>
        <button className="btn btn-sm btn-secondary" onClick={markWon} disabled={saving}>Vyhrané</button>
        <button className="btn btn-sm btn-secondary" onClick={markLost} disabled={saving}>Prehrané</button>
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
          {summary && (
            <div className="detail-grid" style={{ marginTop: 10 }}>
              <div><span className="muted">Náklady</span><div>{fmtMoney(summary.totalCost)}</div></div>
              <div><span className="muted">Marža</span><div>{fmtPercent(summary.marginPercent)}</div></div>
              <div><span className="muted">Rozpočet</span><div>{summary.costPercent != null ? fmtPercent(summary.costPercent) : '—'}</div></div>
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
        <h3 style={{ marginBottom: 8 }}>Ponuky (odkaz)</h3>
        {quoteLinks.length === 0 ? <p className="muted">Žiadne ponuky.</p> : (
          <table className="table">
            <thead><tr><th>Názov</th><th>Stav</th><th>Odkaz</th><th /></tr></thead>
            <tbody>
              {quoteLinks.map(q => (
                <tr key={q.id}>
                  <td>{q.title}</td>
                  <td>{quoteStatusLabel(q.status)}</td>
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
          <label className="field span-2"><span>Odkaz (URL PDF / Drive)</span>
            <input value={quoteForm.link} onChange={e => setQuoteForm({ ...quoteForm, link: e.target.value })} placeholder="https://..." />
          </label>
        </div>
        <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={addQuote} disabled={saving}>+ Pridať ponuku</button>
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
