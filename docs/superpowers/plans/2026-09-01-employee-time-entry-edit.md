# Employee Time Entry Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add daily employee drill-downs and a minimal admin editor for time entries.

**Architecture:** Extend the existing frontend analytics view-model with nested day and employee rows. Reuse the existing API actions and a small modal; keep save-payload normalization in a focused, unit-tested helper.

**Tech Stack:** React, native HTML inputs/details, Node test runner, existing API client.

**Spec:** `docs/superpowers/specs/2026-09-01-employee-time-entry-edit.md`

## Global Constraints

- No new backend action, migration, dependency, audit history, or delete flow.
- The edit control is visible only for `perm_admin` with `perm_projects_read`.
- Existing analytics filters continue to apply.

---

### Task 1: Daily analytics hierarchy

**Files:**
- Modify: `src/modules/employees/employeeAnalytics.js`
- Modify: `src/modules/employees/employeeAnalytics.test.js`
- Modify: `src/modules/employees/EmployeeAnalytics.jsx`

**Interfaces:**
- Produces: `analytics.weeks[].days[].employees[].entries`.
- Consumes: existing sanitized analytics entries and employee options.

- [ ] **Step 1: Write the failing aggregation test**

Add assertions that a week contains chronological days, each day contains alphabetically sorted employees, and their entries are ordered by start time.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --test-name-pattern="týždeň obsahuje dni" src/modules/employees/employeeAnalytics.test.js`

Expected: FAIL because `week.days` does not exist.

- [ ] **Step 3: Implement the minimum nested view-model**

Group each week's rows by `entry.date`, reuse `simpleEmployeeRows(..., true)`, and order each employee's entries by `startTime`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the focused command from Step 2 and expect PASS.

- [ ] **Step 5: Render native nested details**

Replace the flat week row with native `<details>` for week, day, and employee, ending in the existing `EntryTable`.

### Task 2: Minimal admin editor

**Files:**
- Create: `src/modules/employees/timeEntryEdit.js`
- Create: `src/modules/employees/timeEntryEdit.test.js`
- Modify: `src/modules/employees/EmployeeAnalytics.jsx`
- Modify: `src/modules/employees/Employees.jsx`

**Interfaces:**
- Produces: `buildTimeEntryUpdate(form, employees, projects)` returning `{ entry }` for `updateTimeEntry`.
- Consumes: raw selected entry, existing employees, `getProjects`, and `getTimeEntryFormData`.

- [ ] **Step 1: Write failing payload tests**

Cover interval-derived duration, duration-only records, incomplete time pairs, and project labor-cost recalculation.

- [ ] **Step 2: Run the editor tests and verify RED**

Run: `node --test src/modules/employees/timeEntryEdit.test.js`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement the minimal payload helper**

Use native `Date`, validate required selections and positive duration, and emit only fields accepted by existing `updateTimeEntry`.

- [ ] **Step 4: Run the editor tests and verify GREEN**

Run the command from Step 2 and expect PASS.

- [ ] **Step 5: Add the modal and API wiring**

Pass `canEdit`, `onEdit`, and `onSaved` through `Employees`/`EmployeeAnalytics`; load the existing project/task option APIs only when the editor opens; disable save while submitting; reload after success.

### Task 3: Verification and delivery

**Files:**
- Modify only files already listed if verification finds an in-scope defect.

**Interfaces:**
- Consumes: completed frontend feature.
- Produces: green branch and pull request ready for production-gated merge.

- [ ] **Step 1: Run all tests**

Run: `npm test`

- [ ] **Step 2: Run lint and build**

Run: `npm run lint` and `npm run build`.

- [ ] **Step 3: Check the diff**

Run: `git diff --check`, inspect `git diff`, and confirm no backend or dependency-lock changes.

- [ ] **Step 4: Commit, push, and open a PR**

Commit the tested files on `codex/employee-time-entry-edit`, push the branch, and open a PR. Do not merge because merging `main` triggers production deployment.
