export const ALL_EMPLOYEES = 'all'

const UNKNOWN_EMPLOYEE = 'Nezaradený zamestnanec'
const UNKNOWN_PROJECT = 'Nezaradený projekt'
const UNKNOWN_ACTIVITY = 'Nezaradená činnosť'
const ISSUE_CODES = [
  'missing_activity',
  'missing_date',
  'missing_employee',
  'missing_project',
  'missing_time_bounds',
  'over_12_hours',
  'zero_or_invalid_duration',
]

const normalize = value => String(value ?? '')
  .toLocaleLowerCase('sk')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()

const text = value => String(value ?? '').trim()
const entityKey = (id, name) => text(id) ? `id:${text(id)}` : normalize(name) ? `name:${normalize(name)}` : 'unknown'
const activityKey = name => normalize(name) ? `name:${normalize(name)}` : 'unknown'

const pad = value => String(value).padStart(2, '0')
const dateParts = value => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text(value))
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return { year, month, day }
}
const isoDate = ({ year, month, day }) => `${year}-${pad(month)}-${pad(day)}`
const shiftDate = (value, days) => {
  const parts = dateParts(value)
  if (!parts) return ''
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days))
  return isoDate({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() })
}
const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate()

const bratislavaDate = value => {
  if (!value) return ''
  const instant = new Date(value)
  if (Number.isNaN(instant.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Bratislava', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(instant)
  const get = type => parts.find(part => part.type === type)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

const entryDate = raw => dateParts(raw.date) ? text(raw.date) : bratislavaDate(raw.startTime)

function sanitizeEntries(rawEntries = []) {
  const prepared = rawEntries.map(raw => {
    const employeeId = text(raw.employeeId)
    const projectId = text(raw.projectId)
    const rawEmployeeName = text(raw.employeeName)
    const rawProjectName = text(raw.projectName)
    const rawActivityName = text(raw.task ?? raw.activityName)
    const employeeKey = text(raw.employeeKey) || entityKey(employeeId, rawEmployeeName)
    const projectKey = text(raw.projectKey) || entityKey(projectId, rawProjectName)
    const activity = text(raw.activityKey) || activityKey(rawActivityName)
    const rawMinutes = Number(raw.durationMin ?? raw.minutes)
    const minutes = Number.isFinite(rawMinutes) && rawMinutes > 0 ? rawMinutes : 0
    const date = entryDate(raw)
    const startTime = text(raw.startTime)
    const endTime = text(raw.endTime)
    const id = text(raw.id)
    const entry = {
      key: '',
      id,
      employeeKey,
      employeeId,
      employeeName: rawEmployeeName || UNKNOWN_EMPLOYEE,
      projectKey,
      projectId,
      projectName: rawProjectName || UNKNOWN_PROJECT,
      activityKey: activity,
      activityName: rawActivityName || UNKNOWN_ACTIVITY,
      date,
      startTime,
      endTime,
      minutes,
    }
    const signature = [employeeKey, projectKey, activity, date, startTime, endTime, minutes].map(normalize).join('|')
    return { entry, anonymous: !id, baseKey: id ? `id:${id}` : `anon:${encodeURIComponent(signature)}` }
  })

  const totals = new Map()
  for (const item of prepared) totals.set(item.baseKey, (totals.get(item.baseKey) || 0) + 1)
  const seen = new Map()
  for (const item of prepared) {
    const ordinal = (seen.get(item.baseKey) || 0) + 1
    seen.set(item.baseKey, ordinal)
    item.entry.key = item.anonymous && totals.get(item.baseKey) > 1 ? `${item.baseKey}:${ordinal}` : item.baseKey
  }
  return prepared.map(item => item.entry).sort(compareEntries)
}

function compareEntries(left, right) {
  if (left.date !== right.date) {
    if (!left.date) return 1
    if (!right.date) return -1
    return right.date.localeCompare(left.date)
  }
  if (left.startTime !== right.startTime) return right.startTime.localeCompare(left.startTime)
  return left.key.localeCompare(right.key, 'sk')
}

export function resolvePeriod(preset, today, custom = {}) {
  const current = dateParts(today)
  if (!current) return { start: '', end: '', valid: false, error: 'Neplatný dnešný dátum.' }
  if (preset === 'all') return { start: '', end: '', valid: true, error: '' }
  if (preset === 'custom') {
    const start = text(custom.start)
    const end = text(custom.end)
    if (!start || !end) return { start, end, valid: false, error: 'Vyber dátum od aj do.' }
    if (!dateParts(start) || !dateParts(end)) return { start, end, valid: false, error: 'Vyber platný dátum od aj do.' }
    if (start > end) return { start, end, valid: false, error: 'Dátum od nesmie byť neskôr ako dátum do.' }
    return { start, end, valid: true, error: '' }
  }
  if (preset === 'last90') return { start: shiftDate(today, -89), end: today, valid: true, error: '' }
  if (preset === 'thisMonth') return {
    start: `${current.year}-${pad(current.month)}-01`,
    end: `${current.year}-${pad(current.month)}-${pad(daysInMonth(current.year, current.month))}`,
    valid: true, error: '',
  }
  if (preset === 'previousMonth') {
    const date = new Date(Date.UTC(current.year, current.month - 2, 1))
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth() + 1
    return { start: `${year}-${pad(month)}-01`, end: `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`, valid: true, error: '' }
  }
  if (preset === 'thisYear') return { start: `${current.year}-01-01`, end: `${current.year}-12-31`, valid: true, error: '' }
  return { start: '', end: '', valid: false, error: 'Neznáme obdobie.' }
}

export function isoWeekStart(value) {
  const parts = dateParts(value)
  if (!parts) return ''
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  const offset = (date.getUTCDay() + 6) % 7
  return shiftDate(value, -offset)
}

function latestNames(entries, keyField, nameField) {
  const names = new Map()
  for (const entry of entries) {
    const key = entry[keyField]
    const name = text(entry[nameField])
    if (key === 'unknown' || !name || name.startsWith('Nezaraden')) continue
    const candidate = { name, date: entry.date }
    const previous = names.get(key)
    if (!previous || candidate.date > previous.date || (candidate.date === previous.date && candidate.name.localeCompare(previous.name, 'sk') < 0)) {
      names.set(key, candidate)
    }
  }
  return names
}

export function buildEmployeeOptions(employees = [], allRawEntries = []) {
  const entries = sanitizeEntries(allRawEntries)
  const historicalNames = latestNames(entries, 'employeeKey', 'employeeName')
  const options = new Map()
  for (const employee of employees) {
    const id = text(employee.id)
    const name = text(employee.name)
    const key = entityKey(id, name)
    if (key !== 'unknown') options.set(key, { key, id, name: name || historicalNames.get(key)?.name || UNKNOWN_EMPLOYEE, active: true })
  }
  for (const entry of entries) {
    if (entry.employeeKey === 'unknown' || options.has(entry.employeeKey)) continue
    options.set(entry.employeeKey, {
      key: entry.employeeKey,
      id: entry.employeeId,
      name: historicalNames.get(entry.employeeKey)?.name || entry.employeeName,
      active: false,
    })
  }
  return [...options.values()].sort((a, b) => a.name.localeCompare(b.name, 'sk') || a.key.localeCompare(b.key))
}

export function filterEntries(rawEntries = [], { start = '', end = '', valid = true, employeeKey = ALL_EMPLOYEES } = {}) {
  if (!valid) return []
  return sanitizeEntries(rawEntries).filter(entry => {
    if (employeeKey !== ALL_EMPLOYEES && entry.employeeKey !== employeeKey) return false
    if (!start && !end) return true
    return Boolean(entry.date) && (!start || entry.date >= start) && (!end || entry.date <= end)
  })
}

function summarize(entries) {
  return { minutes: entries.reduce((sum, entry) => sum + entry.minutes, 0), records: entries.length }
}

function groupBy(entries, field) {
  const grouped = new Map()
  for (const entry of entries) {
    const key = entry[field]
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(entry)
  }
  return grouped
}

function optionFor(options, key, entry) {
  const option = options.find(item => item.key === key)
  return option || { key, id: entry?.employeeId || '', name: entry?.employeeName || UNKNOWN_EMPLOYEE, active: false }
}

function simpleEmployeeRows(entries, options, includeEntries = false) {
  return [...groupBy(entries, 'employeeKey')].map(([key, rows]) => {
    const option = optionFor(options, key, rows[0])
    const result = { key, id: option.id, name: option.name, ...summarize(rows) }
    if (includeEntries) result.entries = rows
    return result
  }).sort((a, b) => a.name.localeCompare(b.name, 'sk') || a.key.localeCompare(b.key))
}

function simpleProjectRows(entries, names) {
  return [...groupBy(entries, 'projectKey')].map(([key, rows]) => ({
    key,
    id: rows[0].projectId,
    name: names.get(key)?.name || rows[0].projectName,
    ...summarize(rows),
  })).sort((a, b) => a.name.localeCompare(b.name, 'sk') || a.key.localeCompare(b.key))
}

function issueCodes(entry) {
  const codes = []
  if (entry.activityKey === 'unknown') codes.push('missing_activity')
  if (!entry.date) codes.push('missing_date')
  if (entry.employeeKey === 'unknown') codes.push('missing_employee')
  if (entry.projectKey === 'unknown') codes.push('missing_project')
  if (!entry.startTime || !entry.endTime) codes.push('missing_time_bounds')
  if (entry.minutes > 720) codes.push('over_12_hours')
  if (entry.minutes <= 0) codes.push('zero_or_invalid_duration')
  return codes.sort()
}

export function buildAnalytics(filteredRawEntries = [], employeeOptions = []) {
  const entries = sanitizeEntries(filteredRawEntries)
  const projectNames = latestNames(entries, 'projectKey', 'projectName')
  const activityNames = latestNames(entries, 'activityKey', 'activityName')
  const totalMinutes = entries.reduce((sum, entry) => sum + entry.minutes, 0)
  const employeeGroups = groupBy(entries, 'employeeKey')
  const activityGroups = groupBy(entries, 'activityKey')
  const projectGroups = groupBy(entries, 'projectKey')

  const employees = [...employeeGroups].map(([key, rows]) => {
    const option = optionFor(employeeOptions, key, rows[0])
    return {
      key, id: option.id, name: option.name, active: option.active,
      ...summarize(rows),
      projectCount: new Set(rows.map(entry => entry.projectKey)).size,
      activityCount: new Set(rows.map(entry => entry.activityKey)).size,
      entries: rows,
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
    }
  }).sort((a, b) => a.name.localeCompare(b.name, 'sk') || a.key.localeCompare(b.key))

  const activities = [...activityGroups].map(([key, rows]) => ({
    key,
    name: activityNames.get(key)?.name || rows[0].activityName,
    ...summarize(rows),
    employeeCount: new Set(rows.map(entry => entry.employeeKey)).size,
    projectCount: new Set(rows.map(entry => entry.projectKey)).size,
    employees: simpleEmployeeRows(rows, employeeOptions),
    projects: simpleProjectRows(rows, projectNames),
    entries: rows,
  })).sort((a, b) => a.name.localeCompare(b.name, 'sk') || a.key.localeCompare(b.key))

  const projects = [...projectGroups].map(([key, rows]) => ({
    key,
    id: rows[0].projectId,
    name: projectNames.get(key)?.name || rows[0].projectName,
    ...summarize(rows),
    employeeCount: new Set(rows.map(entry => entry.employeeKey)).size,
    activityCount: new Set(rows.map(entry => entry.activityKey)).size,
    activities: [...groupBy(rows, 'activityKey')].map(([activity, activityRows]) => ({
      key: activity,
      name: activityNames.get(activity)?.name || activityRows[0].activityName,
      ...summarize(activityRows),
      employees: simpleEmployeeRows(activityRows, employeeOptions, true),
      entries: activityRows,
    })).sort((a, b) => a.name.localeCompare(b.name, 'sk') || a.key.localeCompare(b.key)),
    entries: rows,
  })).sort((a, b) => a.name.localeCompare(b.name, 'sk') || a.key.localeCompare(b.key))

  const weekGroups = new Map()
  for (const entry of entries.filter(item => item.date)) {
    const key = isoWeekStart(entry.date)
    if (!weekGroups.has(key)) weekGroups.set(key, [])
    weekGroups.get(key).push(entry)
  }
  const weekRows = [...weekGroups].map(([key, rows]) => ({
    key,
    label: `${key} – ${shiftDate(key, 6)}`,
    start: key,
    end: shiftDate(key, 6),
    ...summarize(rows),
  })).sort((a, b) => a.key.localeCompare(b.key))

  const byCode = Object.fromEntries(ISSUE_CODES.map(code => [code, 0]))
  const issueEntries = []
  for (const entry of entries) {
    const codes = issueCodes(entry)
    if (!codes.length) continue
    for (const code of codes) byCode[code] += 1
    issueEntries.push({ entry, codes })
  }

  return {
    totals: {
      minutes: totalMinutes,
      records: entries.length,
      employees: employeeGroups.size,
      projects: projectGroups.size,
      activities: activityGroups.size,
    },
    employees,
    activities,
    projects,
    weeks: weekRows,
    issues: { totalRecords: issueEntries.length, byCode, entries: issueEntries },
  }
}

function comparisonSide(entries, option) {
  const rows = entries.filter(entry => entry.employeeKey === option.key)
  return {
    key: option.key,
    id: option.id,
    name: option.name,
    ...summarize(rows),
    projectCount: new Set(rows.map(entry => entry.projectKey)).size,
    activityCount: new Set(rows.map(entry => entry.activityKey)).size,
  }
}

function comparisonRows(leftEntries, rightEntries, field, nameField, canonicalNames = new Map()) {
  const left = groupBy(leftEntries, field)
  const right = groupBy(rightEntries, field)
  return [...new Set([...left.keys(), ...right.keys()])].map(key => {
    const leftRows = left.get(key) || []
    const rightRows = right.get(key) || []
    const sample = leftRows[0] || rightRows[0]
    const leftMinutes = summarize(leftRows).minutes
    const rightMinutes = summarize(rightRows).minutes
    return {
      key,
      name: canonicalNames.get(key)?.name || sample?.[nameField] || key,
      leftMinutes,
      rightMinutes,
      differenceMinutes: leftMinutes - rightMinutes,
    }
  }).sort((a, b) => a.name.localeCompare(b.name, 'sk') || a.key.localeCompare(b.key))
}

export function buildComparison(periodRawEntries = [], employeeOptions = [], leftKey, rightKey) {
  if (!leftKey || !rightKey || leftKey === rightKey) return null
  const leftOption = employeeOptions.find(option => option.key === leftKey)
  const rightOption = employeeOptions.find(option => option.key === rightKey)
  if (!leftOption || !rightOption) return null
  const entries = sanitizeEntries(periodRawEntries)
  const leftEntries = entries.filter(entry => entry.employeeKey === leftKey)
  const rightEntries = entries.filter(entry => entry.employeeKey === rightKey)
  const relevant = [...leftEntries, ...rightEntries]
  const projectNames = latestNames(relevant, 'projectKey', 'projectName')
  const activityNames = latestNames(relevant, 'activityKey', 'activityName')
  const withWeek = rows => rows.filter(entry => entry.date).map(entry => {
    const weekKey = isoWeekStart(entry.date)
    return { ...entry, weekKey, weekName: `${weekKey} – ${shiftDate(weekKey, 6)}` }
  })
  return {
    left: comparisonSide(entries, leftOption),
    right: comparisonSide(entries, rightOption),
    activities: comparisonRows(leftEntries, rightEntries, 'activityKey', 'activityName', activityNames),
    projects: comparisonRows(leftEntries, rightEntries, 'projectKey', 'projectName', projectNames),
    weeks: comparisonRows(withWeek(leftEntries), withWeek(rightEntries), 'weekKey', 'weekName'),
  }
}

export const sourceLimitReached = rawEntries => rawEntries.length >= 1000
