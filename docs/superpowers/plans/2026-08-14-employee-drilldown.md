# Employee Drill-down Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rozšíriť existujúcu záložku Prehľad o abecednú rozbaľovaciu hierarchiu `zamestnanec → projekt → činnosť → časový záznam`, ktorá nahradí súčasnú plochú zamestnaneckú tabuľku bez novej záložky alebo duplicitného prehľadu.

**Architecture:** Existujúca čistá funkcia `buildAnalytics` doplní ku každému zamestnancovi projekty a činnosti vytvorené z tej istej sanitizovanej prefiltrovanej množiny záznamov. `Overview` iba vykreslí hotový view-model cez natívne `details`/`summary` a existujúci `EntryTable`; načítanie dát, oprávnenia a ostatné analytické vetvy zostanú bez zmeny.

**Tech Stack:** React 19, Vite 8, JavaScript ES modules, zabudovaný `node:test`, existujúce CSS.

## Autoritatívny základ a aktuálny stav

- Zdrojom pravdy sú projektový `AGENTS.md`, schválená špecifikácia `docs/superpowers/specs/2026-08-13-employee-analytics-design.md` a aktuálny kód v `src/modules/employees/`.
- Read-only kontrola 14. 8. 2026 potvrdila vetvu `codex/employee-analytics` a preimplementačný HEAD `0d2d566a8e0e9c02ec3dbbbfed916423e0f385fd`.
- Špecifikácia a `docs/manual-tests/employee-analytics.md` sú tracked. Tento plán je pred schválením untracked; `.planrelay/` je lokálny untracked pracovný artefakt a nesmie sa commitnúť ani mazať.
- `Employees.jsx` vlastní `getEmployees`, podmienené `getTimeEntries`, správu zamestnancov a mesačný výkaz. Analytické dáta sa načítajú iba pri `perm_timesheets` a module `workshop`; route zostáva za `perm_employees`.
- `employeeAnalytics.js` už sanitizuje záznamy, drží ich stabilné poradie a vytvára top-level `employees`, `activities`, `projects`, `weeks` a `issues`. `EmployeeAnalytics.jsx` už obsahuje presne štyri záložky a znovu použiteľný `EntryTable`.
- Aktuálny súbor testov obsahuje 17 testov. `npm run lint` bol v pre-review spustený read-only a skončil exit kódom 0 so siedmimi existujúcimi warningmi mimo modulu Zamestnanci.
- `npm test` sa v read-only pre-review prostredí nedal vykonať: Node test runner skončil na environmentovom `spawn EPERM`. Nie je to dôkaz zlyhania testov. `npm run build` nebol v pre-review spustený, pretože zapisuje výstup do `dist`; oba príkazy sú povinné v autorizovanom implementačnom prostredí.

## Scope, vylúčenia a kritériá úspechu

- Zmeniť iba:
  - `src/modules/employees/employeeAnalytics.test.js`
  - `src/modules/employees/employeeAnalytics.js`
  - `src/modules/employees/EmployeeAnalytics.jsx`
  - `docs/manual-tests/employee-analytics.md`
  - tento plán pri jeho samostatnom schvaľovacom commite.
- Zachovať štyri analytické záložky, všetky filtre, neutrálne porovnanie, upozornenia kvality dát, evidenciu zamestnancov, mesačný výkaz a existujúce oprávnenia bez funkčnej zmeny.
- Nepridávať závislosť, API akciu, fetch, databázovú zmenu, migráciu, auth zmenu, workflow, CSS ani React state pre otvorené položky.
- Nemeníť `Employees.jsx`, `src/index.css`, `src/config.js`, API repozitár ani GAS repozitár.
- Zamestnanci, projekty a činnosti zostanú zoradené abecedne cez slovenské locale. Záznamy zachovajú existujúce poradie: dátum zostupne, začiatok zostupne, key vzostupne.
- Súhrn zamestnanca zobrazí hodiny, podiel evidovaného času, počet projektov, počet činností a počet záznamov. Projekt a činnosť zobrazia hodiny a počet záznamov.
- Kritériom úspechu je jedna hierarchia v Prehľade, konzistentné súčty na všetkých úrovniach, výhradne sanitizované záznamy, 18 úspešných testov, lint bez nového warningu, úspešný build a presný diff scope.

## Bezpečnosť, súkromie a rollback

- Hierarchia smie obsahovať iba existujúci sanitizovaný detail `{ key,id,employeeKey,employeeId,employeeName,projectKey,projectId,projectName,activityKey,activityName,date,startTime,endTime,minutes }`.
- Do view-modelu sa nesmú dostať `hourlyRate`, `laborCost`, `clientId`, `pairingCode`, `secretExtra` ani iné neznáme raw polia. Automatické testy používajú iba syntetické fixtures.
- UI oprávnenia zostávajú iba UX vrstvou; serverová autorizácia sa nemení ani nenahrádza skrytím prvkov.
- Automatické kontroly nevykonajú CRUD, nezmenia produkčné dáta a nevyžadujú produkčný dataset. Prihlásené browser kontroly zostanú `NOT RUN`, kým ich Peter skutočne nevykoná.
- Ak niektorý gate zlyhá, necommitnúť neúplný rez a nič neposielať. Ak už samostatný rez prešiel a bol commitnutý, rollback sa týka iba nových commitov tohto plánu na feature branchi a vykoná sa až po výslovnom pokyne používateľa ako reverzný commit; nepoužiť reset, nemazať `.planrelay/` a neobnovovať databázu, pretože tento scope databázu nemení.

---

## Approval gates

- V rámci jedného review jobu sa `review_plan` volá presne raz; pri stave `running` sa pokračuje iba čakaním na rovnaký job ID.
- `running`, timeout, technická chyba alebo neplatný artefakt nie sú schválenie. Implementácia môže začať iba po finálnom PlanRelay `approved` artefakte.
- Používateľ už v tomto vlákne výslovne povolil implementáciu po finálnom schválení plánu.
- Ak finálny artefakt obsahuje revidovaný plán, pred implementáciou sa použije presne jeho `approved-plan.md`.
- Po oboch schváleniach sa plán commitne pred prvým TDD RED krokom:

```powershell
git add -- docs/superpowers/plans/2026-08-14-employee-drilldown.md
git diff --cached --check
git commit -m "docs(employees): plan employee drill-down"
```

- Push, PR, merge, zmena `main`, deploy a produkčné dáta nie sú súčasťou tohto plánu.

### Task 1: Zamestnanecká hierarchia vo view-modeli

**Files:**
- Modify: `src/modules/employees/employeeAnalytics.test.js`
- Modify: `src/modules/employees/employeeAnalytics.js`

**Interfaces:**
- Consumes: `buildAnalytics(filteredRawEntries, employeeOptions)` a existujúci sanitizovaný detail `{ key,id,employeeKey,employeeId,employeeName,projectKey,projectId,projectName,activityKey,activityName,date,startTime,endTime,minutes }`.
- Produces: každý prvok `analytics.employees` doplní `projects: [{ key,id,name,minutes,records,activities:[{ key,name,minutes,records,entries }] }]`.
- Zachováva: existujúce polia zamestnanca vrátane `active`, `entries`, `projectCount` a `activityCount`; nemení top-level analytické vetvy.

- [ ] **Step 1: Napísať presný regresný test**

Do `employeeAnalytics.test.js` pridať test nad existujúcimi syntetickými fixtures H1–H6:

```js
test('zamestnanec obsahuje projekty, činnosti a sanitizované záznamy', () => {
  const analytics = buildAnalytics(
    filterEntries(entries.slice(0, 5), allRange),
    buildEmployeeOptions(employees, entries),
  )
  const anna = analytics.employees.find(employee => employee.key === 'id:E1')

  assert.deepEqual(anna.projects.map(project => [project.key, project.name, project.minutes, project.records]), [
    ['id:P1', 'Kuchyňa', 120, 1],
    ['id:P2', 'Skriňa', 60, 1],
  ])
  assert.deepEqual(anna.projects[0].activities.map(activity => [activity.key, activity.name, activity.minutes, activity.records]), [
    ['name:brusenie', 'Brúsenie', 120, 1],
  ])
  assert.equal(anna.projects.reduce((sum, project) => sum + project.minutes, 0), anna.minutes)
  assert.equal(anna.projects[0].activities.reduce((sum, activity) => sum + activity.minutes, 0), anna.projects[0].minutes)
  assert.deepEqual(anna.projects[0].activities[0].entries.map(entry => entry.id), ['H1'])
  assert.deepEqual(Object.keys(anna.projects[0].activities[0].entries[0]).sort(), [
    'activityKey', 'activityName', 'date', 'employeeId', 'employeeKey', 'employeeName', 'endTime', 'id', 'key',
    'minutes', 'projectId', 'projectKey', 'projectName', 'startTime',
  ])
})
```

- [ ] **Step 2: Spustiť test a potvrdiť skutočný TDD RED**

Run: `npm test`

Expected: 17 pôvodných testov prejde a nový test zlyhá preto, že `anna.projects` ešte neexistuje. Importná chyba, syntax chyba, fixture chyba alebo `spawn EPERM` nie sú platný RED; pri takom výsledku zastaviť a neimplementovať, kým test runner nemožno korektne spustiť.

- [ ] **Step 3: Doplniť minimálnu agregáciu v `buildAnalytics`**

V existujúcom mapovaní `employees` doplniť `projects` z lokálnych `rows`, `projectNames` a `activityNames`:

```js
projects: [...groupBy(rows, 'projectKey')].map(([projectKey, projectRows]) => ({
  key: projectKey,
  id: projectRows[0].projectId,
  name: projectNames.get(projectKey)?.name || projectRows[0].projectName,
  ...summarize(projectRows),
  activities: [...groupBy(projectRows, 'activityKey')].map(([activityKey, activityRows]) => ({
    key: activityKey,
    name: activityNames.get(activityKey)?.name || activityRows[0].activityName,
    ...summarize(activityRows),
    entries: activityRows,
  })).sort((a, b) => a.name.localeCompare(b.name, 'sk') || a.key.localeCompare(b.key)),
})).sort((a, b) => a.name.localeCompare(b.name, 'sk') || a.key.localeCompare(b.key)),
```

Nevytvárať kópie raw entries a nemeníť existujúce top-level `projects`, `activities`, `weeks`, `issues`, comparison shape ani sanitizačné pravidlá.

- [ ] **Step 4: Overiť GREEN a statickú regresiu**

Run: `npm test`

Expected: 18/18 testov prejde vrátane existujúceho nulového view-modelu, porovnania, kvality dát, radenia a allowlistu.

Run: `npm run lint`

Expected: exit 0, sedem už potvrdených warningov mimo modulu Zamestnanci a žiadny nový warning.

- [ ] **Step 5: Skontrolovať a commitnúť výpočtový rez**

```powershell
git diff --check
git diff -- src/modules/employees/employeeAnalytics.js src/modules/employees/employeeAnalytics.test.js
git add -- src/modules/employees/employeeAnalytics.js src/modules/employees/employeeAnalytics.test.js
git diff --cached --check
git commit -m "feat(employees): add employee drill-down data"
```

Commit vytvoriť iba po úspešnom teste a linte.

### Task 2: Rozbaľovací zoznam v Prehľade

**Files:**
- Modify: `src/modules/employees/EmployeeAnalytics.jsx`

**Interfaces:**
- Consumes: `analytics.employees[].projects[].activities[].entries` z Task 1 a existujúce `hours`, `percentage`, `EntryTable`.
- Produces: natívny drill-down v existujúcom `Overview`; žiadna nová prop, React state ani dátová agregácia.

- [ ] **Step 1: Nahradiť iba plochú zamestnaneckú tabuľku**

V `Overview` zachovať existujúcu sekciu a nadpis `Zamestnanci`. Odstrániť iba jej aktuálny `<TableWrap><table>…</table></TableWrap>` a vložiť:

```jsx
<div className="analytics-details">{analytics.employees.map(employee => (
  <details className="analytics-detail" key={employee.key}>
    <summary>
      <span>
        <strong>{employee.name}</strong>
        <small>{employee.projectCount} proj. · {employee.activityCount} činn. · {employee.records} záz.</small>
      </span>
      <span>{hours(employee.minutes)} · {percentage(employee.minutes, analytics.totals.minutes)}</span>
    </summary>
    <div className="analytics-detail-body">
      {!employee.active && <p className="muted">Historický záznam zamestnanca</p>}
      {employee.projects.map(project => (
        <details className="analytics-detail analytics-detail-nested" key={project.key}>
          <summary>
            <span><strong>{project.name}</strong><small>{project.records} záznamov</small></span>
            <span>{hours(project.minutes)}</span>
          </summary>
          <div className="analytics-detail-body">{project.activities.map(activity => (
            <details className="analytics-detail analytics-detail-nested" key={activity.key}>
              <summary>
                <span><strong>{activity.name}</strong><small>{activity.records} záznamov</small></span>
                <span>{hours(activity.minutes)}</span>
              </summary>
              <div className="analytics-detail-body"><EntryTable entries={activity.entries} /></div>
            </details>
          ))}</div>
        </details>
      ))}
    </div>
  </details>
))}</div>
```

Nevytvoriť piatu záložku, druhý zoznam zamestnancov, ďalší filter ani state pre otvorené položky. Natívne `details` riadia otvorenie; existujúce `.analytics-detail`, `.analytics-detail-nested`, focus a responzívne pravidlá zostávajú jediným stylingom.

- [ ] **Step 2: Overiť UI integráciu**

Run: `npm test`

Expected: 18/18 testov prejde.

Run: `npm run lint`

Expected: exit 0, sedem existujúcich warningov mimo modulu Zamestnanci a žiadny nový warning.

Run: `npm run build`

Expected: exit 0; Vite úspešne skompiluje lazy-loaded modul Zamestnanci. Názov zahashovaného chunku nie je kontrakt a nekontroluje sa presným reťazcom.

- [ ] **Step 3: Skontrolovať a commitnúť UI rez**

```powershell
git diff --check
git diff -- src/modules/employees/EmployeeAnalytics.jsx
git add -- src/modules/employees/EmployeeAnalytics.jsx
git diff --cached --check
git commit -m "feat(employees): show employee drill-down"
```

Commit vytvoriť iba po úspechu testu, lintu a buildu.

### Task 3: Manuálny scenár, dokumentácia a finálny dôkaz

**Files:**
- Modify: `docs/manual-tests/employee-analytics.md`

**Interfaces:**
- Consumes: hotový drill-down z Task 2.
- Produces: transparentný stav manuálneho overenia a finálny dôkaz rozsahu bez produkčného nasadenia.

- [ ] **Step 1: Doplniť manuálnu kontrolu**

Do existujúcej tabuľky pridať riadok 16:

```markdown
| 16 | Prehľad zobrazuje abecedné rozbalenie zamestnanec → projekt → činnosť → záznam; súhrny hodín a počtov sedia s KPI a ostatnými záložkami. | NOT RUN | Vyžaduje prihlásený browser a konkrétny dataset. |
```

Ak Peter scenár skutočne vykoná v prihlásenom lokálnom UI, zmeniť iba tento riadok na `PASS` a zapísať konkrétny overený príklad. Bez pozorovateľného dôkazu ponechať `NOT RUN`.

- [ ] **Step 2: Spustiť predcommitovú finálnu verifikáciu**

Najprv stage-nuť iba manuálny dokument:

```powershell
git add -- docs/manual-tests/employee-analytics.md
git diff --cached --check
npm test
npm run lint
npm run build
git diff --check 0d2d566a8e0e9c02ec3dbbbfed916423e0f385fd
git diff --name-only 0d2d566a8e0e9c02ec3dbbbfed916423e0f385fd
git status --short
```

Expected:

- 18/18 testov prejde.
- Lint skončí exit kódom 0 so siedmimi existujúcimi warningmi mimo modulu Zamestnanci a bez nového warningu.
- Build skončí exit kódom 0.
- Oba diff checky sú bez chyby.
- Scope od preimplementačného HEAD obsahuje iba tento plán, `employeeAnalytics.js`, jeho test, `EmployeeAnalytics.jsx` a manuálny dokument.
- `Employees.jsx`, `src/index.css`, auth, config, lockfile, workflow, backend a GAS nemajú diff.
- Pred dokumentačným commitom je stage-nutý iba manuálny dokument; `.planrelay/` zostáva jediný povolený untracked artefakt.

Pri inom výsledku dokumentáciu necommitnúť a handoff označiť ako neúplný.

- [ ] **Step 3: Commitnúť dokumentáciu**

```powershell
git commit -m "docs(employees): verify employee drill-down"
```

- [ ] **Step 4: Zachytiť finálny post-commit stav**

```powershell
git diff --check 0d2d566a8e0e9c02ec3dbbbfed916423e0f385fd...HEAD
git diff --name-only 0d2d566a8e0e9c02ec3dbbbfed916423e0f385fd...HEAD
git status --short
git rev-parse HEAD
```

Expected:

- Diff check je bez výstupu.
- Name-only zoznam obsahuje presne päť povolených súborov.
- `git status --short` obsahuje nanajvýš existujúce `?? .planrelay/`; žiadny tracked súbor nie je zmenený.
- Handoff uvedie finálny commit hash a že backend deploy nebol potrebný.

## Manuálny checklist pre Petra

Po implementácii, ale mimo automatického dôkazu:

1. Spustiť aplikáciu na povolenom `http://localhost:5173`, prihlásiť sa vhodným kontom a otvoriť Zamestnanci.
2. V Prehľade rozbaliť zamestnanca, projekt a činnosť; jednotlivé záznamy musia používať rovnaké dátumy, intervaly, názvy a trvanie ako ostatné analytické drill-downy.
3. Krížovo sčítať aspoň jedného zamestnanca: súčet projektov sa rovná času zamestnanca a súčet činností sa rovná času projektu.
4. Zmeniť obdobie a globálny filter zamestnanca; hierarchia aj KPI sa musia zmeniť z tej istej množiny dát.
5. Overiť, že zostali presne štyri záložky, Porovnanie je neutrálne a pôvodný mesačný výkaz funguje bez zmeny.
6. Ak dataset obsahuje historického zamestnanca, musí byť označený textom `Historický záznam zamestnanca` a jeho hodiny sa nesmú stratiť.
7. Existujúce scenáre 8 a 9 v manuálnom dokumente naďalej pokrývajú chýbajúce oprávnenie a API chybu; bez skutočného vykonania zostanú `NOT RUN`.

## Review a handoff

- Zdrojom pravdy pre výsledok sú vykonané príkazy, finálny diff a manuálny dokument, nie plánované očakávania.
- Skontrolovať, že JSX používa výhradne `employee.projects` a nereagreguje entries.
- Skontrolovať, že nested view-model obsahuje iba sanitizované polia a existujúci allowlist test zostal zelený.
- Handoff v slovenčine uvedie význam zmeny v aplikácii, krátky zoznam piatich dotknutých súborov, výsledky test/lint/build, stav manuálneho riadku 16, finálny commit hash a informáciu, že backend deploy nebol potrebný.
- Push, PR, merge, `main`, deploy, zmena produkčných dát a vykonanie neprihlásených manuálnych scenárov zostávajú mimo scope.
