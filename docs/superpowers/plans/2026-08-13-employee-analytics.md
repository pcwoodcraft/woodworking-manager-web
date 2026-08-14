# Analytika zamestnancov — prepracovaný implementačný plán

> **Pre implementačného agenta:** Po schválení použi `superpowers:executing-plans` a vykonávaj úlohy po checkpointoch. Tento dokument sám neudeľuje súhlas na implementáciu, push ani nasadenie.

**Cieľ:** Aditívne rozšíriť stránku Zamestnanci o read-only analytiku nad existujúcimi odpoveďami `getEmployees` a `getTimeEntries`, pričom existujúci mesačný výkaz hodín a mzdových nákladov zostane funkčne aj vizuálne zachovaný.

**Architektúra:** `Employees.jsx` zostane vlastníkom načítania dát, CRUD a existujúceho mesačného výkazu. Nový čistý modul `employeeAnalytics.js` vytvorí sanitizovaný view-model a nový `EmployeeAnalytics.jsx` bude spravovať iba filtre, záložky a renderovanie. Backendový kontrakt, databáza, oprávnenia a produkcia sa nemenia.

**Technológie:** React 19, Vite, JavaScript, existujúci CSS systém, vstavaný `node:test`; bez novej závislosti.

## Overený východiskový stav

- Worktree: `C:\pcw\CLAUDE\.worktrees\woodworking-manager-web-employee-analytics`.
- Vetva: `codex/employee-analytics`; zmrazený `BASE_SHA=8fcd719858dcdff3fd3f1f48d77d85807feb179f`.
- Pracovný strom nemá implementačný diff; untracked sú iba `.planrelay/` a návrhové dokumenty pod `docs/superpowers/`.
- `Employees.jsx:102-154` obsahuje existujúci `month`, mesačnú navigáciu, `byEmp`, stĺpce Hodiny a Mzdový náklad. Tieto prvky sa nesmú odstrániť.
- Route `zamestnanci` je pod `RequireModule('employees')` a `RequirePerm('perm_employees')`.
- Serverová akcia `getTimeEntries` vyžaduje `perm_timesheets` aj modul `workshop`.
- Webová odpoveď `getTimeEntries` vracia plné mapované riadky, ktoré môžu obsahovať `hourlyRate` a `laborCost`.
- Node je `24.18.0`. Read-only baseline `npm run lint` skončil s 0 chybami a 7 existujúcimi warningmi mimo modulu Zamestnanci.

## Pevné hranice

- Žiadna nová API akcia, zmena payloadu, databázová zmena, migrácia, zmena oprávnení, auth flow, konfigurácie, závislosti, workflow ani produkčné nasadenie.
- Existujúca evidencia zamestnancov a mesačný výkaz zostanú zachované vrátane navigácie, hodín a mzdového nákladu. Zákaz miezd, sadzieb a nákladov sa vzťahuje výhradne na novú analytickú sekciu a jej view-model.
- Nová analytika nesmie renderovať, kopírovať do view-modelu, persistovať ani logovať `hourlyRate`, `laborCost`, párovacie kódy ani neznáme raw polia.
- Jeden autorizovaný fetch `getTimeEntries` obslúži existujúci mesačný výkaz aj analytiku; komponent analytiky nevykoná vlastný fetch.
- Route zostáva pod modulom `employees` a `perm_employees`. Časové dáta sa načítajú iba pri `can('perm_timesheets') && hasModule('workshop')`.
- UI nesmie tvrdiť úplnosť databázy. Pri najmenej 1 000 vrátených riadkoch zobrazí iba heuristické varovanie.
- Všetok text rozhrania bude po slovensky. Dátumy detailov sa renderujú cez existujúci `fmtDate`.
- Styling použije existujúce premenné a triedy z `src/index.css`; nové triedy budú iba pre chýbajúce analytické rozloženie a neutrálnu výplň grafu.
- Sensitive-data profil: rozsah `limited`; triedy DC2 (identita zamestnanca) a DC3 (projekty, pracovné časy a raw mzdové polia); externé spracovanie `none`; externé vedľajšie účinky `none`. Dáta zostávajú iba v pamäti prihláseného browser klienta a fallback nesmie rozšíriť dáta ani oprávnenia.
- Implementáciu začať iba po PlanRelay `approved`. Neúspešné alebo neúplné kontroly sa necommitujú ani nepushujú.

## Plánované súbory

- Create: `src/modules/employees/employeeAnalytics.js`
- Create: `src/modules/employees/employeeAnalytics.test.js`
- Create: `src/modules/employees/EmployeeAnalytics.jsx`
- Modify: `src/modules/employees/Employees.jsx`
- Modify: `src/index.css`
- Modify: `package.json`
- Create: `docs/manual-tests/employee-analytics.md`
- Create/tracked: `docs/superpowers/specs/2026-08-13-employee-analytics-design.md`
- Create/tracked: `docs/superpowers/plans/2026-08-13-employee-analytics.md`

`.planrelay/` zostáva lokálny untracked artefakt a nikdy sa nestaguje.

## Autoritatívne dátové kontrakty

### Normalizácia identít

Jedna funkcia sa použije pre fallback kľúče zamestnanca, projektu aj činnosti:

1. previesť na string a malé písmená,
2. Unicode NFD,
3. odstrániť kombinujúcu diakritiku,
4. zlúčiť vnútorné whitespace na jednu medzeru,
5. orezať okraje.

Tým sa frontend zhoduje s backendovým `normalizeLabel`. Stabilný skupinový kľúč je:

- neprázdne ID → `id:<trimmed-id>`,
- inak neprázdny normalizovaný názov → `name:<normalized-name>`,
- inak `unknown`.

Rovnaké pravidlo treba doplniť aj do návrhovej špecifikácie, ktorá dnes uvádza iba lowercase/medzery.

### Dátum a časové pásmo

- Platný raw `date` vo formáte skutočného kalendárneho `YYYY-MM-DD` má prednosť.
- Ak chýba alebo je neplatný, `startTime` sa parse-ne ako okamih a dátum sa odvodí explicitne v `Europe/Bratislava`, vrátane DST; nesmie sa použiť `slice(0,10)` ani priame `toIsoDate(startTime)`.
- Ak nemožno odvodiť ani jeden platný dátum, výsledok je `''` a záznam dostane `missing_date`.
- `isoWeekStart` pracuje nad už odvodeným Bratislava dátumom a vráti lokálny pondelok bez UTC posunu.
- Dátum v UI sa zobrazuje cez `fmtDate`; raw ISO timestamp sa nekopíruje do textu ako kalendárny dátum.

### Sanitizovaný záznam

Raw mapovanie kopíruje iba:

| Raw | Sanitizovaný výstup |
|---|---|
| `id` | string `id` |
| `employeeId`, `employeeName` | `employeeKey/id/name` |
| `projectId`, `projectName` | `projectKey/id/name` |
| `task` | `activityKey/name`; API neposkytuje použiteľný `taskId` |
| `date`, fallback `startTime` | Bratislava `YYYY-MM-DD` alebo `''` |
| `startTime`, `endTime` | string iba pre detail a kontrolu kvality |
| `durationMin` | kladné konečné `minutes`, inak 0 |

Každý detail má presne:

`{ key,id,employeeKey,employeeId,employeeName,projectKey,projectId,projectName,activityKey,activityName,date,startTime,endTime,minutes }`.

Ostatné raw polia sa nekopírujú. Fallback názvy sú presne `Nezaradený zamestnanec`, `Nezaradený projekt` a `Nezaradená činnosť`.

`key` je pri ID `id:<id>`. Bez ID vznikne z normalizovaných identít, dátumu, časov a minút; poradový suffix sa použije iba medzi obsahovo identickými sanitizovanými duplikátmi. Množina kľúčov nesmie závisieť od globálneho poradia odpovede.

Detailné záznamy sa zoradia podľa dátumu zostupne, začiatku zostupne a kľúča vzostupne.

### Exportované rozhranie výpočtovej vrstvy

```js
export const ALL_EMPLOYEES = 'all'
export function resolvePeriod(preset, today, custom) // { start,end,valid,error }
export function isoWeekStart(value)                  // pondelok alebo ''
export function buildEmployeeOptions(employees, allRawEntries)
export function filterEntries(rawEntries, { start,end,valid,employeeKey })
export function buildAnalytics(filteredRawEntries, employeeOptions)
export function buildComparison(periodRawEntries, employeeOptions, leftKey, rightKey)
export const sourceLimitReached = rawEntries => rawEntries.length >= 1000
```

`buildEmployeeOptions` vracia `[{key,id,name,active}]`. `active` je odvodené výhradne z prítomnosti osoby v aktuálnej odpovedi `getEmployees`; API také pole neposkytuje. Options vzniknú z aktívnych zamestnancov a nefiltrovaných záznamov, bez `unknown`, a použijú sa vo filtroch, analytike aj porovnaní.

Aktívne meno má prednosť. Historické meno aj kanonické názvy projektov/činností vyberie najnovší platný dátum; pri zhode lexikograficky najmenší neprázdny slovenský názov. Výsledok nesmie závisieť od poradia raw odpovede.

`buildAnalytics` vracia:

```js
{
  totals: { minutes,records,employees,projects,activities },
  employees: [{ key,id,name,active,minutes,records,projectCount,activityCount,entries }],
  activities: [{ key,name,minutes,records,employeeCount,projectCount,
    employees:[{ key,id,name,minutes,records }],
    projects:[{ key,id,name,minutes,records }], entries }],
  projects: [{ key,id,name,minutes,records,employeeCount,activityCount,
    activities:[{ key,name,minutes,records,
      employees:[{ key,id,name,minutes,records,entries }], entries }], entries }],
  weeks: [{ key,label,start,end,minutes,records }],
  issues: { totalRecords,byCode,entries }
}
```

`issues.entries` má presne `[{entry,codes}]`; každý problematický záznam je uvedený raz a jeho kódy sú abecedne. `byCode` vždy obsahuje všetkých sedem kódov vrátane núl.

Nedatovaný záznam pri voľbe Všetky údaje vstupuje do totals, skupín a issues, ale nie do `weeks`. UI pod grafom vysvetlí, že týždenný súčet preto môže byť nižší než KPI.

`buildComparison` vracia presne `{left,right,activities,projects,weeks}`. Strana má `{key,id,name,minutes,records,projectCount,activityCount}` a riadok `{key,name,leftMinutes,rightMinutes,differenceMinutes}`. Rozdiel je `left - right`. Rovnaké alebo neexistujúce kľúče vrátia `null`; platná option bez hodín je nulová strana.

Issue kódy a labely:

```js
{
  zero_or_invalid_duration: 'Nulové alebo neplatné trvanie',
  over_12_hours: 'Záznam dlhší ako 12 hodín',
  missing_date: 'Chýbajúci alebo neplatný dátum',
  missing_time_bounds: 'Chýbajúci začiatok alebo koniec',
  missing_activity: 'Nezaradená činnosť',
  missing_employee: 'Nezaradený zamestnanec',
  missing_project: 'Nezaradený projekt',
}
```

## Preflight implementácie

- [ ] Overiť `git branch --show-current`, `git rev-parse HEAD` a `git status --short`; pokračovať iba na `codex/employee-analytics` a `8fcd719…`, bez cudzieho implementačného diffu.
- [ ] Spustiť `npm run lint` a `npm run build`. Očakávanie: lint 0 errors/iba známych 7 warningov a build exit 0. Pri odchýlke zastaviť bez commitu.
- [ ] Zapísať tento prepracovaný plán a dve objasnenia do tracked spec: jednotná normalizácia a zachovanie existujúceho mesačného výkazu.

## Task 1 — čisté výpočty cez TDD

- [ ] Do `package.json` pridať prenositeľný skript `"test": "node --test \"src/**/*.test.js\""`; nespúšťať `npm install` a nemeniť lockfile.
- [ ] Najprv vytvoriť testovací súbor importujúci ešte neexistujúci `employeeAnalytics.js` a spustiť `npm test`; očakávaný RED je `ERR_MODULE_NOT_FOUND`.
- [ ] Použiť syntetickú fixture H1–H6 z pôvodného plánu; H1 obsahuje aj `hourlyRate`, `laborCost`, `pairingCode` a `secretExtra`. E4 je aktívny bez hodín.
- [ ] Implementovať 17 pomenovaných testov:

1. last90 k 13.8.2026 = 16.5.–13.8.
2. Presné inkluzívne hranice thisMonth, previousMonth, thisYear a all.
3. Chýbajúca alebo prevrátená custom hranica → invalid a slovenská chyba.
4. Filter 2.–3.8. vráti iba H2/H3.
5. Filter `id:E1` vráti dva E1 riadky.
6. Invalid range vráti `[]`.
7. Options obsahujú E1/E2/E4 ako active a E3 ako historical, neobsahujú unknown a sú abecedné.
8. H1–H5 → 990 minút, 5 záznamov, 3 osoby, 4 projekty a 4 činnosti; Brúsenie 150 minút.
9. Presné issue county nad H1–H6: 2/1/1/2/1/1/1.
10. Jednotná normalizácia zamestnanca, projektu aj činnosti vrátane variantov s/bez diakritiky; deterministické názvy a stabilné detailné kľúče po preusporiadaní.
11. 13.8.2026 → pondelok 10.8.; nedatovaný záznam zvýši totals/issues, ale nevytvorí prázdny týždeň.
12. Prázdna agregácia → nulové totals a prázdne polia.
13. E1/E2 porovnanie: 180 vs. 810; Brúsenie 120 vs. 30; rozdiel 90; invalid kľúče → null.
14. 999 riadkov → false, 1 000 → true.
15. Neplatné dátumy `2026-99-99` a `2026-02-30` sú missing/outside filter; fallback `2026-08-01T22:30:00Z` sa v Bratislave zaradí na 2.8.2026.
16. E4 a historický E3 bez hodín sú platné nulové compare strany.
17. JSON analytics/comparison neobsahuje `hourlyRate`, `laborCost`, `clientId`, `pairingCode`, `secretExtra`; detail má iba explicitný allowlist.

- [ ] Implementovať minimálny `employeeAnalytics.js` podľa kontraktov.
- [ ] Spustiť `npm test`; očakávanie 17/17 pass.
- [ ] Spustiť `npm run lint`; žiadna nová chyba ani warning.
- [ ] Commitnúť iba `package.json`, výpočtový modul a jeho test.

## Task 2 — interaktívne analytické UI

- [ ] Vytvoriť `EmployeeAnalytics({employees = [], entries = []})`; komponent nevykonáva fetch, mutation, auth, logovanie ani persistenciu.
- [ ] Stav: `tab`, `preset='last90'`, `customRange`, `employeeKey='all'`, `leftKey`, `rightKey`.
- [ ] Options vytvoriť z aktívnych zamestnancov a nefiltrovaných entries. Analytiku počítať z globálne filtrovaných entries; porovnanie z rovnakého obdobia, ale bez globálneho employee filtra.
- [ ] Pri prvom načítaní vybrať prvé dve rôzne options. Po zmene options zachovať platné voľby a neplatné nahradiť prvými dostupnými rôznymi hodnotami. Pri menej než dvoch možnostiach ponechať pokojný empty state.
- [ ] Vytvoriť filtre Obdobie/Zamestnanec s riadnymi `<label>` a natívnymi date inputmi. Invalid custom rozsah oznámiť slovenským textom s `role="alert"` a nevykresliť záznamy.
- [ ] Znovupoužiť `.tabs`, `.tab` a `.tab.active`; každé tlačidlo bude mať `type="button"` a `aria-pressed`. Zachovať natívne ovládanie klávesnicou a viditeľný focus.
- [ ] Prehľad: päť KPI, abecedný zoznam zamestnancov, týždenný graf a súhrn issues. Dátumy detailov formátovať výhradne cez `fmtDate`.
- [ ] Týždenný graf postaviť na existujúcich `.budget-bar`/`.budget-fill`; pridať iba neutrálnu fill triedu. Šírka je `minutes/max*100`, pri nulovom maxime 0 %.
- [ ] Pod grafom pri existencii nedatovaných rows uviesť, že ich čas nemožno zaradiť do týždňov.
- [ ] Činnosti použiť ako `details → zamestnanci/projekty/záznamy`; Projekty ako `projekt → činnosť → zamestnanec → záznam`. JSX nič nereagreguje.
- [ ] Porovnanie zobrazí dve rovnocenné karty a tabuľky activity/project/week. Rozdiel bude podpísané neutrálne číslo bez farby alebo hodnotiaceho textu.
- [ ] Pri 0 records zobraziť päť nulových KPI a text `V tomto období nie sú evidované žiadne hodiny.` bez prázdnych tabuliek.
- [ ] Pri 1 000+ nefiltrovaných entries zobraziť presné heuristické varovanie o možnej neúplnosti API odpovede.
- [ ] Použiť existujúce `.stat-grid`, `.stat-card`, `.table`, `.card`, `.tabs` a CSS premenné. Doplniť iba analytické grid/wrapper/fill pravidlá a breakpoint do 760 px; tabuľky musia zostať horizontálne dostupné a controls sa nesmú prekrývať.
- [ ] Spustiť `npm test`, `npm run lint`, `npm run build`; očakávanie 17 pass, 0 nových lint problémov a build 0.
- [ ] Commitnúť iba `EmployeeAnalytics.jsx` a súvisiaci minimálny CSS diff.

## Task 3 — aditívna integrácia bez regresie mesačného výkazu

- [ ] V `Employees.jsx` načítať `can` aj `hasModule` a definovať `canHours = can('perm_timesheets') && hasModule('workshop')`.
- [ ] `getTimeEntries` volať iba pri `canHours`. Rovnaká načítaná odpoveď sa použije pre existujúci mesačný výkaz aj novú analytiku.
- [ ] Zachovať `month`, `setMonth`, `monthEntries`, `byEmp` a importy `fmtMoney`, `parseNum`, `fmtMonth`, `thisMonth`, `shiftMonth`, `toIsoDate`.
- [ ] Zachovať nadpis existujúcej karty, month-nav, stĺpce `Hodiny (...)` a `Mzdový náklad` aj ich existujúce výpočty.
- [ ] Vložiť `EmployeeAnalytics` ako samostatnú sekciu až za existujúcu evidenčno-mesačnú kartu.
- [ ] Ak `canHours` neplatí, namiesto analytiky zobraziť kartu `Na zobrazenie štatistík potrebuješ aktívny modul Dielňa a právo na výkazy práce.` Evidencia ostane dostupná a `getTimeEntries` sa nevolá.
- [ ] Zachovať pridanie, editáciu, soft-delete, Modal, Toast, Spinner, ErrorBox/Retry a stĺpce Meno/Iniciály/Kód/Akcie.
- [ ] Spustiť `npm test`, `npm run lint`, `npm run build`; očakávanie 17 pass, 0 nových warningov/chýb a build 0.
- [ ] Review diffu musí potvrdiť, že odstránenie mesačného výkazu ani jeho importov nie je súčasťou zmeny.
- [ ] Commitnúť iba integračný diff `Employees.jsx`.

## Task 4 — dokumentácia, manuálne overenie a handoff

- [ ] Aktualizovať tracked spec tak, aby výslovne rozlišovala: mzdy sú mimo novej analytiky, ale existujúci mesačný výkaz sa zachováva.
- [ ] Vytvoriť `docs/manual-tests/employee-analytics.md` s týmito kontrolami:

1. Full-access konto vidí evidenciu, pôvodný mesačný výkaz aj štyri analytické záložky.
2. Obe month-nav šípky menia pôvodný mesiac; Hodiny a Mzdový náklad pre vybranú osobu sa zhodujú so stavom pred zmenou.
3. Presety a inkluzívne custom hranice menia prvé tri analytické záložky konzistentne.
4. Globálny employee filter neovplyvní Porovnanie; Porovnanie používa dve vlastné osoby.
5. Invalid custom rozsah ukáže presnú chybu a žiadne rows.
6. Drill-down detail zobrazuje cez `fmtDate` dátum, interval, trvanie a fallback názvy; poradie je dátum/začiatok zostupne.
7. Nulová compare strana funguje bez skóre, poradia alebo hodnotiacej farby.
8. Bez timesheet práva alebo workshop modulu zostane evidencia, zmizne pôvodný mesačný výkaz aj analytika a časové API sa nevolá; bez employee práva route ostane neprístupná.
9. Chyba autorizovaného `getTimeEntries` po existujúcich read retry zobrazí ErrorBox; Retry po odblokovaní znova načíta.
10. Pri šírke pod 760 px zostanú filtre, tabs, details a tabuľky ovládateľné.
11. 0/1 employee option vytvorí pokojný compare stav.
12. Platný prázdny filter zobrazí nulové KPI a presný empty text.
13. Chybná syntetická fixture zobrazí všetkých sedem slovenských issue labelov.
14. Klávesnica dosiahne filtre, tabs a `summary`; focus je viditeľný a natívne rozbalenie funguje.
15. KPI, percento osoby a relatívne šírky aspoň dvoch týždňov sa manuálne porovnajú s view-modelom.

- [ ] Kroky vyžadujúce konto, UI mock alebo produkčné dáta označiť `NOT RUN` s dôvodom, ak ich agent nemôže bezpečne vykonať. Nikdy ich nevykázať ako PASS bez dôkazu.
- [ ] Peter vykoná prípadný CRUD smoke až samostatne na disposable zázname; agent produkčné dáta nemení.
- [ ] Commitnúť manual test, aktualizovanú spec a tento plán. `.planrelay/` nestagovať.

## Finálna verifikácia

Spustiť z čistého pracovného HEAD:

```powershell
npm test
npm run lint
npm run build
git diff --check 8fcd719858dcdff3fd3f1f48d77d85807feb179f...HEAD
git diff --name-only 8fcd719858dcdff3fd3f1f48d77d85807feb179f...HEAD
git diff --stat 8fcd719858dcdff3fd3f1f48d77d85807feb179f...HEAD
git status --short
git rev-parse HEAD
```

Očakávania:

- 17/17 unit testov pass.
- Lint má 0 errors a žiadny nový warning oproti overeným siedmim baseline warningom.
- Build exit 0.
- Diff check je čistý.
- Diff obsahuje presne deväť plánovaných súborov; žiadny config, lockfile, backend, migráciu ani workflow.
- Po dokumentačnom commite zostáva untracked iba `.planrelay/`.
- Ku každému z deviatich akceptačných bodov spec existuje unit, render, permission, manuálny alebo diff dôkaz.

## Git a odovzdanie

- Každý commit obsahuje iba súbory svojej úlohy; cudzie zmeny sa nestagujú.
- Po každej review oprave sa zopakuje relevantný test a review nového HEAD.
- Push je dovolený až po všetkých kontrolách a iba ako `git push -u origin HEAD` z vetvy `codex/employee-analytics`.
- Žiadny push na `main`, force-push, PR merge, tag, release ani deployment.
- Handoff uvedie výsledok v aplikácii, krátky zoznam súborov, doslovný HEAD, BASE SHA, výsledky test/lint/build, že backend deploy nebol potrebný, a manuálne kroky označené PASS alebo NOT RUN.
