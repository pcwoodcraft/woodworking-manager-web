import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ALL_EMPLOYEES,
  buildAnalytics,
  buildComparison,
  buildEmployeeOptions,
  filterEntries,
  isoWeekStart,
  resolvePeriod,
  sourceLimitReached,
} from './employeeAnalytics.js'

const employees = [
  { id: 'E1', name: 'Anna Stolárka' },
  { id: 'E2', name: 'Boris Majster' },
  { id: 'E4', name: 'Dana Nová' },
]

const entries = [
  {
    id: 'H1', employeeId: 'E1', employeeName: 'Anna Stolárka',
    projectId: 'P1', projectName: 'Kuchyňa', task: 'Brúsenie', date: '2026-08-01',
    startTime: '2026-08-01T08:00:00+02:00', endTime: '2026-08-01T10:00:00+02:00', durationMin: 120,
    hourlyRate: 25, laborCost: 50, clientId: 'client-1', pairingCode: '123456', secretExtra: 'never-copy',
  },
  {
    id: 'H2', employeeId: 'E1', employeeName: 'Anna Stolárka',
    projectId: 'P2', projectName: 'Skriňa', task: 'Montáž', date: '2026-08-02',
    startTime: '2026-08-02T08:00:00+02:00', endTime: '2026-08-02T09:00:00+02:00', durationMin: 60,
  },
  {
    id: 'H3', employeeId: 'E2', employeeName: 'Boris Majster',
    projectId: 'P1', projectName: 'Kuchyňa', task: 'Brúsenie', date: '2026-08-03',
    startTime: '2026-08-03T08:00:00+02:00', endTime: '2026-08-03T08:30:00+02:00', durationMin: 30,
  },
  {
    id: 'H4', employeeId: 'E2', employeeName: 'Boris Majster',
    projectId: 'P3', projectName: 'Dvere', task: 'Lakovanie', date: '2026-08-13',
    startTime: '2026-08-13T06:00:00+02:00', endTime: '2026-08-13T19:00:00+02:00', durationMin: 780,
  },
  {
    id: 'H5', employeeId: 'E3', employeeName: 'Cyril Historický',
    projectId: '', projectName: '', task: '', date: '2026-08-04',
    startTime: '', endTime: '', durationMin: 0,
  },
  {
    id: '', employeeId: '', employeeName: '',
    projectId: 'P1', projectName: 'Kuchyňa', task: 'Brúsenie', date: '',
    startTime: '', endTime: '', durationMin: -15,
  },
]

const allRange = { start: '', end: '', valid: true, employeeKey: ALL_EMPLOYEES }
const augustRange = { start: '2026-08-01', end: '2026-08-31', valid: true, employeeKey: ALL_EMPLOYEES }

test('last90 zahŕňa dnešok a predchádzajúcich 89 dní', () => {
  assert.deepEqual(resolvePeriod('last90', '2026-08-13'), {
    start: '2026-05-16', end: '2026-08-13', valid: true, error: '',
  })
})

test('predvoľby obdobia majú presné lokálne hranice', () => {
  assert.deepEqual(resolvePeriod('thisMonth', '2026-08-13'), { start: '2026-08-01', end: '2026-08-31', valid: true, error: '' })
  assert.deepEqual(resolvePeriod('previousMonth', '2026-08-13'), { start: '2026-07-01', end: '2026-07-31', valid: true, error: '' })
  assert.deepEqual(resolvePeriod('thisYear', '2026-08-13'), { start: '2026-01-01', end: '2026-12-31', valid: true, error: '' })
  assert.deepEqual(resolvePeriod('all', '2026-08-13'), { start: '', end: '', valid: true, error: '' })
})

test('vlastné obdobie odmietne chýbajúcu alebo obrátenú hranicu', () => {
  assert.deepEqual(resolvePeriod('custom', '2026-08-13', { start: '', end: '2026-08-03' }), {
    start: '', end: '2026-08-03', valid: false, error: 'Vyber dátum od aj do.',
  })
  assert.deepEqual(resolvePeriod('custom', '2026-08-13', { start: '2026-08-04', end: '2026-08-03' }), {
    start: '2026-08-04', end: '2026-08-03', valid: false, error: 'Dátum od nesmie byť neskôr ako dátum do.',
  })
})

test('dátumový filter používa inkluzívne hranice', () => {
  const filtered = filterEntries(entries, { start: '2026-08-02', end: '2026-08-03', valid: true, employeeKey: ALL_EMPLOYEES })
  assert.deepEqual(filtered.map(entry => entry.id), ['H3', 'H2'])
})

test('filter zamestnanca používa stabilný employee key', () => {
  assert.deepEqual(filterEntries(entries, { ...augustRange, employeeKey: 'id:E1' }).map(entry => entry.id), ['H2', 'H1'])
})

test('neplatné obdobie nevráti žiadne záznamy', () => {
  assert.deepEqual(filterEntries(entries, { start: '2026-08-03', end: '2026-08-02', valid: false, employeeKey: ALL_EMPLOYEES }), [])
})

test('options spájajú aktívnych a historických zamestnancov bez unknown', () => {
  assert.deepEqual(buildEmployeeOptions(employees, entries), [
    { key: 'id:E1', id: 'E1', name: 'Anna Stolárka', active: true },
    { key: 'id:E2', id: 'E2', name: 'Boris Majster', active: true },
    { key: 'id:E3', id: 'E3', name: 'Cyril Historický', active: false },
    { key: 'id:E4', id: 'E4', name: 'Dana Nová', active: true },
  ])
})

test('analytics počíta totals a činnosti vrátane nezaradených skupín', () => {
  const options = buildEmployeeOptions(employees, entries)
  const analytics = buildAnalytics(filterEntries(entries.slice(0, 5), allRange), options)
  assert.deepEqual(analytics.totals, { minutes: 990, records: 5, employees: 3, projects: 4, activities: 4 })
  assert.equal(analytics.activities.find(activity => activity.name === 'Brúsenie').minutes, 150)
  assert.ok(analytics.projects.some(project => project.name === 'Nezaradený projekt'))
  assert.ok(analytics.activities.some(activity => activity.name === 'Nezaradená činnosť'))
})

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

test('issues počíta všetkých sedem kódov a každý chybný záznam raz', () => {
  const analytics = buildAnalytics(filterEntries(entries, allRange), buildEmployeeOptions(employees, entries))
  assert.deepEqual(analytics.issues.byCode, {
    missing_activity: 1,
    missing_date: 1,
    missing_employee: 1,
    missing_project: 1,
    missing_time_bounds: 2,
    over_12_hours: 1,
    zero_or_invalid_duration: 2,
  })
  assert.equal(analytics.issues.totalRecords, 3)
  assert.equal(analytics.issues.entries.length, 3)
  assert.deepEqual([...analytics.issues.entries[0].codes].sort(), analytics.issues.entries[0].codes)
})

test('normalizácia a anonymné keys sú stabilné po preusporiadaní', () => {
  const variants = [
    { employeeName: ' Žofia  Nová ', projectName: 'Kuchyňa', task: ' BRÚSENIE ', date: '2026-08-02', startTime: 'a', endTime: 'b', durationMin: 20 },
    { employeeName: 'zofia nova', projectName: 'KUCHYŇA', task: 'brusenie', date: '2026-08-03', startTime: 'c', endTime: 'd', durationMin: 30 },
    { employeeName: 'Žofia Nová', projectName: 'Kuchyňa', task: 'Brúsenie', date: '2026-08-02', startTime: 'a', endTime: 'b', durationMin: 20 },
  ]
  const first = filterEntries(variants, allRange)
  const second = filterEntries([...variants].reverse(), allRange)
  assert.deepEqual(first.map(entry => entry.key).sort(), second.map(entry => entry.key).sort())
  assert.equal(new Set(first.map(entry => entry.key)).size, 3)
  const analytics = buildAnalytics(first, buildEmployeeOptions([], variants))
  assert.equal(analytics.employees.length, 1)
  assert.equal(analytics.projects.length, 1)
  assert.equal(analytics.activities.length, 1)
  assert.equal(analytics.activities[0].name, 'brusenie')
  assert.deepEqual(filterEntries([
    { id: 'same', employeeName: 'A', durationMin: 1 },
    { id: 'same', employeeName: 'B', durationMin: 1 },
  ], allRange).map(entry => entry.key), ['id:same', 'id:same'])
})

test('týždne začínajú pondelkom a nedatovaný záznam nevytvorí prázdny týždeň', () => {
  assert.equal(isoWeekStart('2026-08-13'), '2026-08-10')
  const filtered = filterEntries(entries, allRange)
  const analytics = buildAnalytics(filtered, buildEmployeeOptions(employees, entries))
  const comparison = buildComparison(filtered, buildEmployeeOptions(employees, entries), 'id:E1', 'id:E2')
  assert.equal(analytics.totals.records, 6)
  assert.equal(analytics.issues.byCode.missing_date, 1)
  assert.ok(analytics.weeks.every(week => week.key))
  assert.ok(comparison.weeks.every(week => week.key))
})

test('týždeň obsahuje chronologické dni, zamestnancov a ich záznamy', () => {
  const dailyEntries = [
    { id: 'D3', employeeId: 'E2', employeeName: 'Boris Majster', projectId: 'P1', projectName: 'Kuchyňa', task: 'Montáž', date: '2026-08-04', startTime: '2026-08-04T09:00:00+02:00', endTime: '2026-08-04T10:00:00+02:00', durationMin: 60 },
    { id: 'D2', employeeId: 'E1', employeeName: 'Anna Stolárka', projectId: 'P1', projectName: 'Kuchyňa', task: 'Brúsenie', date: '2026-08-03', startTime: '2026-08-03T10:00:00+02:00', endTime: '2026-08-03T11:00:00+02:00', durationMin: 60 },
    { id: 'D1', employeeId: 'E1', employeeName: 'Anna Stolárka', projectId: 'P1', projectName: 'Kuchyňa', task: 'Rezanie', date: '2026-08-03', startTime: '2026-08-03T07:00:00+02:00', endTime: '2026-08-03T08:00:00+02:00', durationMin: 60 },
    { id: 'D4', employeeId: 'E2', employeeName: 'Boris Majster', projectId: 'P1', projectName: 'Kuchyňa', task: 'Balenie', date: '2026-08-03', startTime: '2026-08-03T08:00:00+02:00', endTime: '2026-08-03T09:00:00+02:00', durationMin: 60 },
  ]
  const analytics = buildAnalytics(dailyEntries, buildEmployeeOptions(employees, dailyEntries))

  assert.deepEqual(analytics.weeks[0].days.map(day => day.key), ['2026-08-03', '2026-08-04'])
  assert.deepEqual(analytics.weeks[0].days[0].employees.map(employee => employee.name), ['Anna Stolárka', 'Boris Majster'])
  assert.deepEqual(analytics.weeks[0].days[0].employees[0].entries.map(entry => entry.id), ['D1', 'D2'])
})

test('prázdna agregácia vracia pokojný nulový tvar', () => {
  assert.deepEqual(buildAnalytics([], []), {
    totals: { minutes: 0, records: 0, employees: 0, projects: 0, activities: 0 },
    employees: [], activities: [], projects: [], weeks: [],
    issues: {
      totalRecords: 0,
      byCode: { missing_activity: 0, missing_date: 0, missing_employee: 0, missing_project: 0, missing_time_bounds: 0, over_12_hours: 0, zero_or_invalid_duration: 0 },
      entries: [],
    },
  })
})

test('porovnanie vracia neutrálne rozdiely a presný tvar', () => {
  const filtered = filterEntries(entries, augustRange)
  const comparison = buildComparison(filtered, buildEmployeeOptions(employees, entries), 'id:E1', 'id:E2')
  assert.deepEqual(Object.keys(comparison), ['left', 'right', 'activities', 'projects', 'weeks'])
  assert.equal(comparison.left.minutes, 180)
  assert.equal(comparison.right.minutes, 810)
  assert.deepEqual(comparison.activities.find(row => row.name === 'Brúsenie'), {
    key: 'name:brusenie', name: 'Brúsenie', leftMinutes: 120, rightMinutes: 30, differenceMinutes: 90,
  })
  assert.equal(buildComparison(filtered, buildEmployeeOptions(employees, entries), 'id:E1', 'id:E1'), null)
  assert.equal(buildComparison(filtered, buildEmployeeOptions(employees, entries), 'id:nope', 'id:E2'), null)
})

test('zdrojový limit je iba heuristika od 1000 riadkov', () => {
  assert.equal(sourceLimitReached(Array(999)), false)
  assert.equal(sourceLimitReached(Array(1000)), true)
})

test('neplatné dátumy sa odmietnu a timestamp sa prevedie do Bratislavy', () => {
  const dated = filterEntries([
    { id: 'bad-1', employeeId: 'E1', date: '2026-99-99', durationMin: 1 },
    { id: 'bad-2', employeeId: 'E1', date: '2026-02-30', durationMin: 1 },
    { id: 'tz', employeeId: 'E1', date: '', startTime: '2026-08-01T22:30:00Z', endTime: '2026-08-01T23:00:00Z', durationMin: 30 },
  ], allRange)
  assert.deepEqual(dated.map(entry => [entry.id, entry.date]), [['tz', '2026-08-02'], ['bad-1', ''], ['bad-2', '']])
  assert.deepEqual(filterEntries(dated, { start: '2026-08-02', end: '2026-08-02', valid: true, employeeKey: ALL_EMPLOYEES }).map(entry => entry.id), ['tz'])
})

test('aktívna aj historická osoba bez hodín zostáva nulovou compare stranou', () => {
  const options = buildEmployeeOptions(employees, entries)
  const noHours = filterEntries(entries, { start: '2026-09-01', end: '2026-09-30', valid: true, employeeKey: ALL_EMPLOYEES })
  const comparison = buildComparison(noHours, options, 'id:E4', 'id:E3')
  assert.equal(comparison.left.name, 'Dana Nová')
  assert.equal(comparison.left.minutes, 0)
  assert.equal(comparison.right.name, 'Cyril Historický')
  assert.equal(comparison.right.minutes, 0)
})

test('verejný view-model obsahuje iba povolené polia', () => {
  const filtered = filterEntries(entries, allRange)
  const options = buildEmployeeOptions(employees, entries)
  const serialized = JSON.stringify({ analytics: buildAnalytics(filtered, options), comparison: buildComparison(filtered, options, 'id:E1', 'id:E2') })
  for (const forbidden of ['hourlyRate', 'laborCost', 'clientId', 'pairingCode', 'secretExtra']) {
    assert.equal(serialized.includes(forbidden), false)
  }
  assert.deepEqual(Object.keys(filtered[0]).sort(), [
    'activityKey', 'activityName', 'date', 'employeeId', 'employeeKey', 'employeeName', 'endTime', 'id', 'key',
    'minutes', 'projectId', 'projectKey', 'projectName', 'startTime',
  ])
})
