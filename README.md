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
| Zákazníci / CRM | pipeline dopytov, ponuky, reklamácie, obrat z úhrad |
| Projekty | stavy, náklady, faktúry, **úhrady od zákazníka**, odovzdanie |
| Faktúry | prijaté + vydané; u vydaných **+ Úhrada** / Uhradiť zvyšok |
| Administrácia | používatelia, firemné údaje faktúr, záloha DB, dielenské chyby |
