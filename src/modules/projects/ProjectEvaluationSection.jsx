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
  // F2/T10-01: mzdové náklady sú neúplné — marža vychádza vyššia, než je v skutočnosti.
  // Percento sa v takom prípade zo servera vôbec nevracia (null); suma je len horný odhad.
  const margeNeuplna = !!evaluation.marginDataIncomplete
  const margeDovod = evaluation.marginDataIncompleteReason === 'no_rate'
    ? 'Projekt nemá zadanú hodinovú sadzbu, takže odpracované hodiny sa do nákladov nezapočítali.'
    : 'Niektoré záznamy hodín nemajú vyčíslený mzdový náklad, takže sa do nákladov nezapočítali.'
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

      {canSeeCosts && margeNeuplna && (
        <p className="pill pill-warn" style={{ marginBottom: 12, display: 'block' }}>
          Neúplné mzdové náklady — marža nižšie je len horný odhad. {margeDovod}
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
              <Stat
                label={margeNeuplna ? 'Očakávaná marža (najviac)' : 'Očakávaná marža'}
                value={fmtMoney(evaluation.expectedMarginNet)}
                warn={margeNeuplna}
                sub={margeNeuplna
                  ? 'chýbajú mzdové náklady — skutočná je nižšia'
                  : (evaluation.expectedMarginPercent != null
                    ? fmtPercent(evaluation.expectedMarginPercent) + ' voči zmluve'
                    : '—')}
              />
            ) : (
              <Stat
                label={margeNeuplna ? 'Realizovaná marža (najviac)' : 'Realizovaná marža'}
                value={fmtMoney(evaluation.realizedMarginNet)}
                warn={margeNeuplna}
                sub={margeNeuplna
                  ? 'chýbajú mzdové náklady — skutočná je nižšia'
                  : (evaluation.realizedMarginPercent != null
                    ? fmtPercent(evaluation.realizedMarginPercent) + ' z inkasa'
                    : '—')}
              />
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
