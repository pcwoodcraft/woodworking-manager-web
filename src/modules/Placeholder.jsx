// Dočasná stránka modulu počas vývoja Fázy 1 — moduly sa dopĺňajú postupne
// a každý sa pred ďalším otestuje s Petrom.
export default function Placeholder({ title }) {
  return (
    <div className="page">
      <header className="page-head"><h1>{title}</h1></header>
      <div className="card">
        <p className="muted">Tento modul sa práve prenáša do novej aplikácie. Zatiaľ ho používaj v pôvodnej.</p>
      </div>
    </div>
  )
}
