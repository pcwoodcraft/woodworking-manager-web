import { useEffect, useMemo, useState } from 'react'
import { fmtDate } from '../../utils/format'
import {
  ALL_EMPLOYEES,
  buildAnalytics,
  buildComparison,
  buildEmployeeOptions,
  filterEntries,
  resolvePeriod,
  sourceLimitReached,
} from './employeeAnalytics'

const TABS = [
  ['overview', 'Prehľad'],
  ['activities', 'Podľa činností'],
  ['projects', 'Podľa projektov'],
  ['comparison', 'Porovnanie'],
]

const PERIODS = [
  ['last90', 'Posledných 90 dní'],
  ['thisMonth', 'Tento mesiac'],
  ['previousMonth', 'Minulý mesiac'],
  ['thisYear', 'Tento rok'],
  ['all', 'Všetky údaje'],
  ['custom', 'Vlastné obdobie'],
]

const ISSUE_LABELS = {
  zero_or_invalid_duration: 'Nulové alebo neplatné trvanie',
  over_12_hours: 'Záznam dlhší ako 12 hodín',
  missing_date: 'Chýbajúci alebo neplatný dátum',
  missing_time_bounds: 'Chýbajúci začiatok alebo koniec',
  missing_activity: 'Nezaradená činnosť',
  missing_employee: 'Nezaradený zamestnanec',
  missing_project: 'Nezaradený projekt',
}

const hours = minutes => (minutes / 60).toLocaleString('sk-SK', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + ' h'
const percentage = (minutes, total) => total ? (minutes / total * 100).toLocaleString('sk-SK', { maximumFractionDigits: 1 }) + ' %' : '0 %'
const difference = minutes => `${minutes > 0 ? '+' : ''}${hours(minutes)}`

function todayInBratislava() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Bratislava', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const get = type => parts.find(part => part.type === type)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

function fmtTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('sk-SK', {
    timeZone: 'Europe/Bratislava', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

function TableWrap({ children }) {
  return <div className="analytics-table-wrap">{children}</div>
}

function EntryTable({ entries }) {
  if (!entries.length) return null
  return (
    <TableWrap>
      <table className="table analytics-detail-table">
        <thead><tr><th>Dátum</th><th>Čas</th><th>Zamestnanec</th><th>Projekt</th><th>Činnosť</th><th className="num">Trvanie</th></tr></thead>
        <tbody>{entries.map(entry => (
          <tr key={entry.key}>
            <td>{fmtDate(entry.date)}</td>
            <td>{fmtTime(entry.startTime)} – {fmtTime(entry.endTime)}</td>
            <td>{entry.employeeName}</td>
            <td>{entry.projectName}{entry.projectId ? <small className="analytics-id">ID: {entry.projectId}</small> : null}</td>
            <td>{entry.activityName}</td>
            <td className="num">{hours(entry.minutes)}</td>
          </tr>
        ))}</tbody>
      </table>
    </TableWrap>
  )
}

function Kpis({ totals }) {
  const items = [
    ['Odpracovaný čas', hours(totals.minutes)],
    ['Záznamy', totals.records.toLocaleString('sk-SK')],
    ['Zamestnanci', totals.employees.toLocaleString('sk-SK')],
    ['Projekty', totals.projects.toLocaleString('sk-SK')],
    ['Činnosti', totals.activities.toLocaleString('sk-SK')],
  ]
  return <div className="stat-grid analytics-kpis">{items.map(([label, value]) => (
    <div className="stat-card" key={label}><div className="stat-label">{label}</div><div className="stat-value">{value}</div></div>
  ))}</div>
}

function Overview({ analytics }) {
  const maxMinutes = Math.max(0, ...analytics.weeks.map(week => week.minutes))
  return <>
    <Kpis totals={analytics.totals} />
    {analytics.totals.records === 0 ? <p className="muted analytics-empty">V tomto období nie sú evidované žiadne hodiny.</p> : <>
      <section className="analytics-block">
        <h3>Časové rozdelenie po týždňoch</h3>
        <div className="analytics-weeks">{analytics.weeks.map(week => (
          <div className="analytics-week" key={week.key}>
            <div className="analytics-week-label"><span>{fmtDate(week.start)} – {fmtDate(week.end)}</span><strong>{hours(week.minutes)}</strong></div>
            <div className="budget-bar" aria-label={`${week.label}: ${hours(week.minutes)}`}>
              <div className="budget-fill analytics-fill" style={{ width: `${maxMinutes ? week.minutes / maxMinutes * 100 : 0}%` }} />
            </div>
          </div>
        ))}</div>
        {analytics.issues.byCode.missing_date > 0 && <p className="muted analytics-note">Čas z nedatovaných záznamov nemožno zaradiť do týždňov, preto môže byť súčet grafu nižší než celkový čas.</p>}
      </section>

      <section className="analytics-block">
        <h3>Zamestnanci</h3>
        <TableWrap><table className="table">
          <thead><tr><th>Meno</th><th className="num">Hodiny</th><th className="num">Podiel času</th><th className="num">Projekty</th><th className="num">Činnosti</th><th className="num">Záznamy</th></tr></thead>
          <tbody>{analytics.employees.map(employee => <tr key={employee.key}>
            <td className="strong">{employee.name}{!employee.active && <small className="analytics-id">historický záznam</small>}</td>
            <td className="num">{hours(employee.minutes)}</td><td className="num">{percentage(employee.minutes, analytics.totals.minutes)}</td>
            <td className="num">{employee.projectCount}</td><td className="num">{employee.activityCount}</td><td className="num">{employee.records}</td>
          </tr>)}</tbody>
        </table></TableWrap>
      </section>
    </>}

    <section className="analytics-block">
      <h3>Kvalita evidencie</h3>
      {analytics.issues.totalRecords === 0 ? <p className="muted">Bez upozornení v zobrazených záznamoch.</p> : <>
        <p>{analytics.issues.totalRecords.toLocaleString('sk-SK')} záznamov obsahuje aspoň jedno upozornenie.</p>
        <ul className="analytics-issues">{Object.entries(analytics.issues.byCode).map(([code, count]) => (
          <li key={code}><span>{ISSUE_LABELS[code]}</span><strong>{count.toLocaleString('sk-SK')}</strong></li>
        ))}</ul>
      </>}
    </section>
  </>
}

function Activities({ analytics }) {
  if (!analytics.activities.length) return <p className="muted analytics-empty">V tomto období nie sú evidované žiadne hodiny.</p>
  return <div className="analytics-details">{analytics.activities.map(activity => (
    <details className="analytics-detail" key={activity.key}>
      <summary><span><strong>{activity.name}</strong><small>{activity.employeeCount} zam. · {activity.projectCount} proj. · {activity.records} záz.</small></span><span>{hours(activity.minutes)} · {percentage(activity.minutes, analytics.totals.minutes)}</span></summary>
      <div className="analytics-detail-body">
        <h4>Zamestnanci</h4>
        <TableWrap><table className="table"><thead><tr><th>Meno</th><th className="num">Hodiny</th><th className="num">Záznamy</th></tr></thead><tbody>
          {activity.employees.map(employee => <tr key={employee.key}><td>{employee.name}</td><td className="num">{hours(employee.minutes)}</td><td className="num">{employee.records}</td></tr>)}
        </tbody></table></TableWrap>
        <h4>Projekty</h4>
        <TableWrap><table className="table"><thead><tr><th>Projekt</th><th className="num">Hodiny</th><th className="num">Záznamy</th></tr></thead><tbody>
          {activity.projects.map(project => <tr key={project.key}><td>{project.name}</td><td className="num">{hours(project.minutes)}</td><td className="num">{project.records}</td></tr>)}
        </tbody></table></TableWrap>
        <h4>Jednotlivé záznamy</h4><EntryTable entries={activity.entries} />
      </div>
    </details>
  ))}</div>
}

function Projects({ analytics }) {
  if (!analytics.projects.length) return <p className="muted analytics-empty">V tomto období nie sú evidované žiadne hodiny.</p>
  return <div className="analytics-details">{analytics.projects.map(project => (
    <details className="analytics-detail" key={project.key}>
      <summary><span><strong>{project.name}</strong><small>{project.activityCount} činn. · {project.employeeCount} zam. · {project.records} záz.</small></span><span>{hours(project.minutes)}</span></summary>
      <div className="analytics-detail-body">
        {project.id && <p className="muted">ID projektu: {project.id}</p>}
        {project.activities.map(activity => <details className="analytics-detail analytics-detail-nested" key={activity.key}>
          <summary><span><strong>{activity.name}</strong><small>{activity.records} záznamov</small></span><span>{hours(activity.minutes)}</span></summary>
          <div className="analytics-detail-body">
            {activity.employees.map(employee => <details className="analytics-detail analytics-detail-nested" key={employee.key}>
              <summary><span><strong>{employee.name}</strong><small>{employee.records} záznamov</small></span><span>{hours(employee.minutes)}</span></summary>
              <div className="analytics-detail-body"><EntryTable entries={employee.entries} /></div>
            </details>)}
          </div>
        </details>)}
      </div>
    </details>
  ))}</div>
}

function ComparisonTable({ title, rows, leftName, rightName }) {
  if (!rows.length) return null
  return <section className="analytics-block"><h3>{title}</h3><TableWrap><table className="table">
    <thead><tr><th>Položka</th><th className="num">{leftName}</th><th className="num">{rightName}</th><th className="num">Rozdiel</th></tr></thead>
    <tbody>{rows.map(row => <tr key={row.key}><td>{row.name}</td><td className="num">{hours(row.leftMinutes)}</td><td className="num">{hours(row.rightMinutes)}</td><td className="num">{difference(row.differenceMinutes)}</td></tr>)}</tbody>
  </table></TableWrap></section>
}

function Comparison({ options, comparison, leftKey, rightKey, setLeftKey, setRightKey }) {
  if (options.length < 2) return <p className="muted analytics-empty">Na porovnanie sú potrební aspoň dvaja zamestnanci.</p>
  return <>
    <div className="analytics-compare-selects">
      <label className="field"><span>Prvý zamestnanec</span><select value={leftKey} onChange={event => setLeftKey(event.target.value)}>{options.map(option => <option value={option.key} key={option.key}>{option.name}</option>)}</select></label>
      <label className="field"><span>Druhý zamestnanec</span><select value={rightKey} onChange={event => setRightKey(event.target.value)}>{options.map(option => <option value={option.key} key={option.key}>{option.name}</option>)}</select></label>
    </div>
    {!comparison ? <p className="muted analytics-empty">Vyber dvoch rôznych zamestnancov.</p> : <>
      <div className="analytics-compare-cards">{[comparison.left, comparison.right].map(side => <div className="card" key={side.key}>
        <h3>{side.name}</h3><div className="stat-value">{hours(side.minutes)}</div>
        <p className="muted">{side.records} záznamov · {side.projectCount} projektov · {side.activityCount} činností</p>
      </div>)}</div>
      <ComparisonTable title="Činnosti" rows={comparison.activities} leftName={comparison.left.name} rightName={comparison.right.name} />
      <ComparisonTable title="Projekty" rows={comparison.projects} leftName={comparison.left.name} rightName={comparison.right.name} />
      <ComparisonTable title="Týždne" rows={comparison.weeks} leftName={comparison.left.name} rightName={comparison.right.name} />
    </>}
  </>
}

export default function EmployeeAnalytics({ employees = [], entries = [] }) {
  const [tab, setTab] = useState('overview')
  const [preset, setPreset] = useState('last90')
  const [customRange, setCustomRange] = useState({ start: '', end: '' })
  const [employeeKey, setEmployeeKey] = useState(ALL_EMPLOYEES)
  const [leftKey, setLeftKey] = useState('')
  const [rightKey, setRightKey] = useState('')
  const today = useMemo(() => todayInBratislava(), [])
  const options = useMemo(() => buildEmployeeOptions(employees, entries), [employees, entries])
  const period = useMemo(() => resolvePeriod(preset, today, customRange), [preset, today, customRange])
  const filtered = useMemo(() => filterEntries(entries, { ...period, employeeKey }), [entries, period, employeeKey])
  const periodEntries = useMemo(() => filterEntries(entries, { ...period, employeeKey: ALL_EMPLOYEES }), [entries, period])
  const analytics = useMemo(() => buildAnalytics(filtered, options), [filtered, options])
  const comparison = useMemo(() => buildComparison(periodEntries, options, leftKey, rightKey), [periodEntries, options, leftKey, rightKey])

  useEffect(() => {
    if (!options.some(option => option.key === leftKey)) setLeftKey(options[0]?.key || '')
    const nextRight = options.find(option => option.key !== (options.some(item => item.key === leftKey) ? leftKey : options[0]?.key))?.key || ''
    if (!options.some(option => option.key === rightKey) || rightKey === leftKey) setRightKey(nextRight)
  }, [options, leftKey, rightKey])

  useEffect(() => {
    if (employeeKey !== ALL_EMPLOYEES && !options.some(option => option.key === employeeKey)) setEmployeeKey(ALL_EMPLOYEES)
  }, [options, employeeKey])

  return <section className="card analytics">
    <div className="card-head"><div><h2>Štatistiky práce zamestnancov</h2><p className="muted">Neutrálne porovnanie evidovaného času podľa zamestnancov, činností a projektov.</p></div></div>

    {sourceLimitReached(entries) && <p className="analytics-warning" role="status">API vrátilo najmenej 1 000 záznamov. Odpoveď môže byť obmedzená a nemusí obsahovať všetky záznamy databázy.</p>}

    <div className="analytics-filters">
      <label className="field"><span>Obdobie</span><select value={preset} onChange={event => setPreset(event.target.value)}>{PERIODS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      {preset === 'custom' && <>
        <label className="field"><span>Dátum od</span><input type="date" value={customRange.start} onChange={event => setCustomRange(range => ({ ...range, start: event.target.value }))} /></label>
        <label className="field"><span>Dátum do</span><input type="date" value={customRange.end} onChange={event => setCustomRange(range => ({ ...range, end: event.target.value }))} /></label>
      </>}
      {tab !== 'comparison' && <label className="field"><span>Zamestnanec</span><select value={employeeKey} onChange={event => setEmployeeKey(event.target.value)}>
        <option value={ALL_EMPLOYEES}>Všetci zamestnanci</option>{options.map(option => <option value={option.key} key={option.key}>{option.name}{option.active ? '' : ' (historický)'}</option>)}
      </select></label>}
    </div>
    {!period.valid && <p className="analytics-warning" role="alert">{period.error}</p>}

    <div className="tabs analytics-tabs" role="group" aria-label="Členenie štatistík">{TABS.map(([value, label]) => (
      <button type="button" className={`tab ${tab === value ? 'active' : ''}`} aria-pressed={tab === value} onClick={() => setTab(value)} key={value}>{label}</button>
    ))}</div>

    {tab === 'overview' && <Overview analytics={analytics} />}
    {tab === 'activities' && <Activities analytics={analytics} />}
    {tab === 'projects' && <Projects analytics={analytics} />}
    {tab === 'comparison' && <Comparison options={options} comparison={comparison} leftKey={leftKey} rightKey={rightKey} setLeftKey={setLeftKey} setRightKey={setRightKey} />}
  </section>
}
