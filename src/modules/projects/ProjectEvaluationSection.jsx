import { fmtMoney, fmtPercent } from '../../utils/format'

function Stat({ label, value, sub, warn }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={'stat-value' + (warn ? ' budget-label-warn' : '')}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

export default function ProjectEvaluationSection({ evaluation, canSeeCosts, embedded }) {
  if (!evaluation || !evaluation.applicable) return null

  const incomplete = evaluation.incompletePayment
  const Wrapper = embedded ? 'div' : 'div'
  const className = embedded ? '' : 'card'

  return (
    <Wrapper className={className}>
      {!embedded && <h2>Vyhodnotenie zákazky</h2>}
      {embedded && <h4 style={{ marginBottom: 8 }}>Vyhodnotenie zákazky</h4>}

      {incomplete && (
        <p className="pill pill-warn" style={{ marginBottom: 12, display: 'inline-block' }}>
          Neúplné inkaso — finálna marža až po doplatku
        </p>
      )}

      <div className="stat-grid">
        <Stat label="Cena zákazky (bez DPH)" value={fmtMoney(evaluation.contractNet)} />
        <Stat label="Uhradené" value={fmtMoney(evaluation.paidNet)} />
        <Stat
          label="Zostáva"
          value={fmtMoney(evaluation.remainingNet)}
          warn={evaluation.remainingNet > 0.01}
        />
      </div>

      {canSeeCosts && (
        <>
          <div className="budget-breakdown" style={{ marginTop: 16 }}>
            <div className="row"><span>Mzdové náklady</span><span>{fmtMoney(evaluation.laborCost)}</span></div>
            <div className="row"><span>Materiál</span><span>{fmtMoney(evaluation.materialCost)}</span></div>
            <div className="row"><span>Prijaté faktúry</span><span>{fmtMoney(evaluation.incomingCost)}</span></div>
            {evaluation.complaintCost > 0 && (
              <div className="row"><span>Reklamácie</span><span>{fmtMoney(evaluation.complaintCost)}</span></div>
            )}
            <div className="row strong"><span>Náklady spolu</span><span>{fmtMoney(evaluation.totalCostWithComplaints)}</span></div>
          </div>

          <div className="stat-grid" style={{ marginTop: 16 }}>
            {incomplete ? (
              <>
                <Stat
                  label="Očakávaná marža"
                  value={fmtMoney(evaluation.expectedMarginNet)}
                  sub={evaluation.expectedMarginPercent != null
                    ? fmtPercent(evaluation.expectedMarginPercent) + ' voči zmluve'
                    : '—'}
                />
              </>
            ) : (
              <>
                <Stat
                  label="Realizovaná marža"
                  value={fmtMoney(evaluation.realizedMarginNet)}
                  sub={evaluation.realizedMarginPercent != null
                    ? fmtPercent(evaluation.realizedMarginPercent) + ' z inkasa'
                    : '—'}
                />
              </>
            )}
            <Stat
              label="Odchýlka hodín"
              value={evaluation.hoursVariance != null
                ? (evaluation.hoursVariance > 0 ? '+' : '') + evaluation.hoursVariance + ' h'
                : '—'}
              sub={evaluation.hoursVariancePercent != null
                ? fmtPercent(evaluation.hoursVariancePercent) + ' od odhadu'
                : evaluation.hoursEstimated ? '' : 'bez odhadu hodín'}
            />
            <Stat
              label="Odchýlka materiálu"
              value={evaluation.materialVariance != null ? fmtMoney(evaluation.materialVariance) : '—'}
              sub={evaluation.materialEstimated ? 'odhad ' + fmtMoney(evaluation.materialEstimated) : 'bez odhadu'}
            />
          </div>
        </>
      )}

      {!canSeeCosts && evaluation.paymentComplete && (
        <p className="muted" style={{ marginTop: 12 }}>Projekt je plne uhradený.</p>
      )}
    </Wrapper>
  )
}
