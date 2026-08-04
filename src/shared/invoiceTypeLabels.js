// Popisky typov vydaných faktúr. Sú v `shared/`, lebo ich potrebuje aj detail projektu (stĺpec
// „Typ" v tabuľke vydaných faktúr) — a ten kvôli obyčajnému číselníku nesmie staticky ťahať kód
// modulu fakturácie (fáza 2b, Úloha C2, Krok 3b).
export const TYPE_LABELS = {
  faktura: 'Faktúra (rad F)',
  zalohova: 'Zálohová faktúra (rad Z)',
  dokoncova: 'Dofakturácia (rad F)',
  ostra: 'Ostrá faktúra (rad F)',
}
