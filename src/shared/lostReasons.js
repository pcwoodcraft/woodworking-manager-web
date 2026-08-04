// Dôvody prehry dopytu. Zdieľaný číselník bez logiky — používa ho CRM (Kanban, detail dopytu,
// modál prehry) aj modul projektov (zrušenie projektu s naviazaným dopytom). Býval v
// `modules/customers/crmConstants.js`, čo z modulu projektov robilo statického konzumenta
// CRM kódu; preto je odteraz v `shared/` (fáza 2b, Úloha C0).
export const LOST_REASONS = [
  { value: 'cena', label: 'Cena' },
  { value: 'termin', label: 'Termín' },
  { value: 'konkurencia', label: 'Konkurencia' },
  { value: 'nereaguje', label: 'Klient nereaguje' },
  { value: 'nerealny', label: 'Nereálny dopyt' },
  { value: 'ine', label: 'Iné' },
]
