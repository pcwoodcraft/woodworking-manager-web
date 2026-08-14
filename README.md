# PCW Manager (woodworking-manager-web)

React frontend pre interný systém stolárstva — zákazníci, CRM, projekty, faktúry a úhrady, ekonomika (cash-flow), zamestnanci, dashboard.

**Ostrá adresa:** https://pcwoodcraft.github.io/woodworking-manager-web/

Živý prehľad projektu: [`../woodworking-manager-stav-a-plan.md`](../woodworking-manager-stav-a-plan.md)

## Technológie

- React 19 + Vite
- Google Identity Services (prihlásenie cez firemný Google účet)
- Backend: Google Apps Script API 2.0 (`woodworking-manager-gas`)

## Vývoj

```bash
npm install
npm run dev
```

Aplikácia beží na `http://localhost:5173`. OAuth client musí mať v Google Cloud Console **Authorized JavaScript origins**:
- `http://localhost:5173` (vývoj)
- `https://pcwoodcraft.github.io` (GitHub Pages)

## Konfigurácia

Identifikátory v `src/config.js`:

- `API_URL` — URL nasadeného Apps Script web app
- `GOOGLE_CLIENT_ID` — OAuth client ID pre GIS

## Deploy

Push do vetvy `main` spustí GitHub Actions workflow (`.github/workflows/deploy.yml`) a nasadí build na GitHub Pages. Vite `base: './'` kvôli hostingu v podpriečinku. Deploy trvá cca 2–5 minút — stav: [GitHub Actions](https://github.com/pcwoodcraft/woodworking-manager-web/actions).

## Štruktúra

```
src/
  api/          API klient (token, retry, chyby)
  auth/         prihlásenie, práva, RequirePerm
  components/   Layout, Modal, Toast, UI
  modules/      dashboard, customers (CRM), projects, invoices, costs, employees, admin
  utils/        formátovanie dátumov a súm (SK)
```

## Hlavné moduly

| Modul | Čo robí |
|---|---|
| Zákazníci / CRM | pipeline dopytov, ponuky, Ateliér (vizualizácie), reklamácie, obrat z úhrad |
| Projekty | stavy, náklady, faktúry, **úhrady od zákazníka**, odovzdanie, súbory na Drive |
| Faktúry | prijaté + vydané; u vydaných **+ Úhrada** / Uhradiť zvyšok |
| Ekonomika | cash-flow mesiac po mesiaci; karty príjmy/výdavky + tabuľka úhrad projektov |
| Zamestnanci | evidencia, mesačný výkaz a analytika času podľa zamestnancov, projektov a činností; neutrálne porovnanie |
| Administrácia | používatelia, firemné údaje faktúr, **denný e-mail pripomienok**, záloha DB, dielenské chyby |

### Zamestnanci — analytika práce (`/zamestnanci`)

Route vyžaduje aktívny modul `employees` a právo `perm_employees`. Mesačný výkaz a analytika sa zobrazia len s aktívnym modulom `workshop` a právom `perm_timesheets`; používajú existujúce odpovede `getEmployees` a `getTimeEntries`, bez nového backendu alebo databázovej migrácie.

Spoločný filter obdobia a zamestnanca riadi KPI, týždenné časové rozdelenie a štyri pohľady: **Prehľad**, **Činnosti**, **Projekty** a **Porovnanie**. Prehľad obsahuje drill-down `zamestnanec → projekt → činnosť → záznam`; projekty majú vnorené činnosti a záznamy. Porovnanie dvoch ľudí je zámerne neutrálne — ukazuje iba evidovaný čas a rozdiely bez skóre, poradia alebo hodnotenia kvality práce. Pôvodný mesačný výkaz hodín a mzdových nákladov zostal zachovaný.

### Ekonomika (`/ekonomika`)

Vyžaduje `perm_costs_full`. Zobrazuje mesačný cash-flow (bez DPH) a štyri tabuľky výdavkov (fixné, jednorazové, mzdy, prijaté FA). Nad výdavkami tabuľka **Príjmy — úhrady projektov** — projekty, ktoré mali v danom mesiaci úhradu; stĺpec „Zostáva uhradiť (aktuálne)“ ukazuje dnešný zostatok, nie stav ku koncu minulého mesiaca.

### Drive linky v appke

PDF ponúk, vizualizácie a súbory projektu sa otvárajú priamo na Google Drive. Kolega potrebuje príslušné právo v manageri (`perm_customers`, `perm_files`, …) — **nemusí** mať prístup na celý Shared Drive. Po nasadení backendu @60+ spustiť batch migráciu v GAS editore (návod v `woodworking-manager-gas/README.md`).

### Administrácia — denný e-mail pripomienok

Sekcia **Denný e-mail s pripomienkami** (`perm_admin`): zapnutie/vypnutie, prahy (dni pred štartom / termín / neaktivita dopytu), tlačidlo **Odoslať e-mail teraz** (test alebo okamžitý súhrn). E-mail ide na `adminEmail` (rovnaká adresa ako problematické hodiny z dielne).

Odkaz z e-mailu na dopyt otvorí kartu zákazníka s parametrom `?deal=` — detail dopytu sa zobrazí automaticky.
