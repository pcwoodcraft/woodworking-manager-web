# AGENTS.md — PCW Manager frontend (woodworking-manager-web)

React web app for the internal system of a Slovak woodworking company (PCW):
customers/CRM, quotes + Ateliér, projects, invoices + payments, economics,
employees, admin. Live at https://pcwoodcraft.github.io/woodworking-manager-web/
Live overview & roadmap: `../woodworking-manager-stav-a-plan.md` ·
**backend: `../woodworking-manager-api/`** (Supabase edge function + Postgres).
`../woodworking-manager-gas/` is only the Google worker (Drive, PDF, e-mails) and the proxy.

## Critical facts (read first)

- **Pushing to `main` deploys to production.** GitHub Actions builds and publishes
  to GitHub Pages on every push (~2–5 min). There is no staging — commit to `main`
  only when the approved scope is finished and `npm run lint` + `npm run build` pass.
- **The API contract lives in `../woodworking-manager-api/`.** Every `apiCall('actionName', payload)`
  must match a handler in `supabase/functions/api/router.ts` and a permission entry in
  `supabase/functions/api/perm/permMap.ts`. Never invent action names or payload fields. If a
  feature needs a new/changed action, the backend must be implemented and deployed **before** the
  frontend push. (`../woodworking-manager-gas/src/Actions.js` is dead pre-migration code — do not
  use it as the contract.)
- **Requests still go through the old Apps Script URL, which proxies to the edge function.**
  `src/config.js` → GAS `/exec` → Supabase. That extra hop is intentional for now; switching
  `config.js` to the edge URL directly is a planned, separate change.
- **`Content-Type: text/plain` in `src/api/client.js` is intentional.** It avoids the CORS
  preflight that Apps Script cannot handle, and the edge parser accepts text bodies on purpose.
  Never "fix" it to `application/json` — the app would stop working.
- **HashRouter and Vite `base: './'` are required by GitHub Pages** (subfolder
  hosting). Never switch to BrowserRouter or absolute base.
- **Permission checks in the UI are cosmetics.** `RequirePerm` and menu filtering
  only improve UX; the server enforces `perm_*` on every action. Never treat
  hiding a button as a security measure, and never skip `RequirePerm` on new routes.
- **`src/config.js` holds the deployed API URL and OAuth client ID.** These are
  public identifiers (safe in the repo), but changing them breaks the app — only
  touch them when the backend deployment or OAuth client actually changed.

## Commands

- `npm run dev` — dev server at http://localhost:5173 (this origin is whitelisted
  in the OAuth client; other ports won't allow Google sign-in).
- `npm run lint` and `npm run build` — both must pass before any commit; they are
  the definition of "done" (there is no automated test suite).
- Deploy = commit + push to `main`. Report the commit hash in your summary.

## Architecture

- React 19 + Vite, plain JavaScript (JSX), no TypeScript, no UI library.
- `src/api/client.js` — single API client: adds the Google token, maps backend
  `{ ok:false, error, message }` to `ApiError`, auto-retries **reads only**
  (actions whose name starts with `get`) 3×. Mutations are never retried —
  name actions accordingly.
- `src/auth/` — Google Identity Services login (`AuthContext`), silent token
  refresh, `UNAUTHORIZED` from the API triggers sign-out. Google sign-in cannot
  be tested in an embedded preview (iframe is blocked) — Peter tests it in his browser.
- `src/modules/<domain>/` — one folder per domain (dashboard, customers/CRM,
  quotes, atelier, projects, invoices, costs, employees, admin, social, stats).
  Routes live in `src/App.jsx`, each behind `RequirePerm`.
- `src/utils/format.js` — `fmtMoney`, `fmtDate` etc. Always use these; never
  format dates/amounts inline.

## Conventions

- **All UI text in Slovak.** Dates `D.M.YYYY`, money `1 234,56 €`.
- **Styling: only the custom classes from `src/index.css`** (`.card`, `.btn`,
  `.table`, `.badge-*`, `.pill-*`, `.form-grid`, kanban classes, …) and its
  `:root` CSS variables (`--ink`, `--gold`, `--paper`, …). Do not add a CSS
  framework, inline color hexes, or a parallel design system. Brand: DM Sans
  for text, DM Mono for amounts and IDs; dark sidebar + light content.
- Two ESLint rules are **deliberately disabled** in `eslint.config.js`
  (`react-hooks/set-state-in-effect`, `react-refresh/only-export-components`) —
  the load()-in-effect pattern is intentional; don't re-enable or "fix" them.
- Follow the surrounding module's patterns (load/error/spinner handling, Modal,
  Toast) before inventing new ones.

## Autonomy & approvals

Work autonomously through the whole approved scope; don't stop after each edit.
Search this repo, the backend repo, and the docs above before asking anything.

**Never without explicit approval:** changing `src/config.js` identifiers,
auth flow changes, adding dependencies, changing the GitHub Actions workflow,
large-scale refactoring. Routine commit + push of an approved change is
expected, not forbidden.

## Testing & completion

No automated tests. For every change: run `npm run lint` and `npm run build`,
think through edge cases (empty data, missing permission, API error), and
provide a **manual test checklist in Slovak** (what Peter clicks and what he
should see). Finish with a summary: what changed and why, affected files,
commit hash, whether a backend deploy was required, and any manual steps.

## Communication

Respond in **Slovak**. Peter has strong technical thinking but is not a
professional developer: lead with what the change means in the app, explain
necessary jargon in one sentence, keep file lists short. Never simplify into
inaccuracy.

## Git checkpoints

- After a user-approved write task, review the diff and run relevant checks.
- Work on a `codex/*` or `agent/*` branch.
- Commit only files from the current task, then push with
  `git push -u origin HEAD` when the branch cannot deploy production.
- Never automatically push `main` or `master`, force-push, create tags, merge,
  publish, or deploy.
- Do not commit or push a read-only audit, failed checks, incomplete work, or
  unrelated changes; report the exact reason.
