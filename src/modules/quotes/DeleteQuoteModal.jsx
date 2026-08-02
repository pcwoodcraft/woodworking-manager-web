import Modal from '../../components/Modal'

// Audit T1-02 (zvyšok) — zrušenie / zmazanie cenovej ponuky.
//
// Server sa zámerne správa DVOMA spôsobmi a dialóg to musí povedať dopredu, inak človek klikne
// „Zmazať" a ponuka zostane v zozname:
//   • ponuka s vygenerovaným PDF sa NEMAŽE, len sa preklopí do stavu „Zrušená" — doklad už mohol
//     odísť zákazníkovi, takže po ňom musí zostať stopa,
//   • ponuka bez PDF sa zmaže naozaj, aj s položkami,
//   • ponuka prepojená s projektom sa nezmaže vôbec (odmietne to server).
export default function DeleteQuoteModal({ quote, onClose, onConfirm, saving, serverError }) {
  const cislo = String(quote.quoteNumber || quote.id || '').trim()
  const maPdf = !!String(quote.pdfUrl || '').trim()
  const jeVProjekte = !!String(quote.projectId || '').trim()

  return (
    <Modal title={maPdf ? 'Zrušiť ponuku ' + cislo : 'Zmazať ponuku ' + cislo} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Späť</button>
        <button className="btn" onClick={onConfirm} disabled={saving || jeVProjekte}>
          {saving ? 'Pracujem…' : (maPdf ? 'Zrušiť ponuku' : 'Zmazať ponuku')}
        </button>
      </>}>

      {jeVProjekte ? (
        <p style={{ marginTop: 0 }}>
          Ponuka <strong>{cislo}</strong> je prepojená s projektom <strong>{quote.projectId}</strong>,
          preto sa zrušiť ani zmazať nedá. Ak to naozaj treba, najprv rieš projekt.
        </p>
      ) : maPdf ? (
        <>
          <p style={{ marginTop: 0, marginBottom: 12 }}>
            Ponuka <strong>{cislo}</strong> má vygenerované PDF, takže sa <strong>nezmaže</strong> —
            preklopí sa do stavu <strong>Zrušená</strong>.
          </p>
          <ul className="muted" style={{ marginBottom: 0, paddingLeft: 18 }}>
            <li>Zostane v zozname ponúk so stavom Zrušená.</li>
            <li>PDF na Disku zostáva — doklad už mohol odísť zákazníkovi.</li>
            <li>Číslo ponuky sa do radu nevracia.</li>
          </ul>
        </>
      ) : (
        <>
          <p style={{ marginTop: 0, marginBottom: 12 }}>
            Ponuka <strong>{cislo}</strong> nemá vygenerované PDF, takže sa zmaže
            <strong> natrvalo</strong>, aj s položkami.
          </p>
          <ul className="muted" style={{ marginBottom: 0, paddingLeft: 18 }}>
            <li>Zo zoznamu ponúk zmizne.</li>
            <li>Číslo ponuky sa do radu nevracia.</li>
            <li>Späť sa to vrátiť nedá.</li>
          </ul>
        </>
      )}

      {serverError && (
        <p className="muted" style={{ marginTop: 12, color: 'var(--danger, #b00)' }}>
          {serverError}
        </p>
      )}
    </Modal>
  )
}
