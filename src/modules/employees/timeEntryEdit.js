import { parseNum, toIsoDate } from '../../utils/format.js'

const required = (value, message) => {
  const result = String(value ?? '').trim()
  if (!result) throw new Error(message)
  return result
}

const BRATISLAVA_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Bratislava', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
})

function bratislavaParts(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const parts = BRATISLAVA_FORMAT.formatToParts(date)
  const get = type => parts.find(part => part.type === type)?.value || ''
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') }
}

function timeForInput(value) {
  if (!value) return ''
  const parts = bratislavaParts(value)
  return parts ? `${parts.hour}:${parts.minute}` : ''
}

function dateForInput(value) {
  const parts = bratislavaParts(value)
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : ''
}

function nextDate(value) {
  const date = new Date(`${value}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

function bratislavaWallTime(date, time) {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const target = Date.UTC(year, month - 1, day, hour, minute)
  let guess = new Date(target)
  for (let attempt = 0; attempt < 2; attempt++) {
    const parts = bratislavaParts(guess)
    if (!parts) break
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second))
    guess = new Date(guess.getTime() + target - represented)
  }
  return guess
}

export function timeEntryToForm(entry) {
  return {
    id: String(entry.id ?? ''),
    employeeId: String(entry.employeeId ?? ''),
    projectId: String(entry.projectId ?? ''),
    task: String(entry.task ?? entry.activityName ?? ''),
    date: toIsoDate(entry.date) || dateForInput(entry.startTime),
    startTime: timeForInput(entry.startTime),
    endTime: timeForInput(entry.endTime),
    hours: String(parseNum(entry.durationMin ?? entry.minutes) / 60),
  }
}

export function buildTimeEntryUpdate(form, employees, projects) {
  const id = required(form.id, 'Chýba ID záznamu.')
  const employeeId = required(form.employeeId, 'Vyber zamestnanca.')
  const projectId = required(form.projectId, 'Vyber projekt.')
  const task = required(form.task, 'Vyplň činnosť.')
  const date = required(form.date, 'Vyplň dátum.')
  const employee = employees.find(item => String(item.id) === employeeId)
  const project = projects.find(item => String(item.id) === projectId)
  if (!employee) throw new Error('Vybraný zamestnanec sa nenašiel.')
  if (!project) throw new Error('Vybraný projekt sa nenašiel.')

  const start = String(form.startTime ?? '').trim()
  const end = String(form.endTime ?? '').trim()
  if (!!start !== !!end) throw new Error('Vyplň začiatok aj koniec, alebo nechaj oba časy prázdne.')

  let startTime = ''
  let endTime = ''
  let durationMin
  if (start && end) {
    const startDate = bratislavaWallTime(date, start)
    let endDate = bratislavaWallTime(date, end)
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) throw new Error('Vyplň platný dátum a čas.')
    const overnight = endDate <= startDate
    if (overnight) endDate = bratislavaWallTime(nextDate(date), end)
    durationMin = Math.round((endDate - startDate) / 60000)
    if (durationMin <= 0 || (overnight && durationMin > 720)) throw new Error('Koniec musí byť neskôr ako začiatok.')
    startTime = startDate.toISOString()
    endTime = endDate.toISOString()
  } else {
    durationMin = Math.round(parseNum(form.hours) * 60)
    if (durationMin <= 0) throw new Error('Vyplň kladný počet hodín.')
  }

  const hasRate = project.hourlyRate !== '' && project.hourlyRate != null
  const hourlyRate = hasRate ? parseNum(project.hourlyRate) : ''
  const laborCost = hasRate ? Math.round(durationMin / 60 * hourlyRate * 100) / 100 : ''
  return { entry: {
    id,
    employeeId,
    employeeName: employee.name,
    projectId,
    projectName: project.name,
    task,
    date,
    startTime,
    endTime,
    durationMin,
    hourlyRate,
    laborCost,
  } }
}
