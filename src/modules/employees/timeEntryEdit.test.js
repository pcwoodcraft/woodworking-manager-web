import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTimeEntryUpdate, timeEntryToForm } from './timeEntryEdit.js'

const employees = [{ id: 'E1', name: 'Anna Stolárka' }]
const projects = [{ id: 'P1', name: 'Kuchyňa', hourlyRate: '30' }]
const base = {
  id: 'H1', employeeId: 'E1', projectId: 'P1', task: 'Brúsenie', date: '2026-09-01',
  startTime: '', endTime: '', hours: '1,5',
}

test('interval určí trvanie a prepočíta mzdový náklad', () => {
  const { entry } = buildTimeEntryUpdate({ ...base, startTime: '08:00', endTime: '10:30', hours: '9' }, employees, projects)

  assert.equal(entry.durationMin, 150)
  assert.equal(entry.hourlyRate, 30)
  assert.equal(entry.laborCost, 75)
  assert.equal(entry.startTime, '2026-09-01T06:00:00.000Z')
  assert.equal(entry.endTime, '2026-09-01T08:30:00.000Z')
  assert.equal((new Date(entry.endTime) - new Date(entry.startTime)) / 60000, 150)
})

test('záznam bez intervalu použije počet hodín a vyčistí časy', () => {
  const { entry } = buildTimeEntryUpdate(base, employees, projects)

  assert.deepEqual(entry, {
    id: 'H1',
    employeeId: 'E1',
    employeeName: 'Anna Stolárka',
    projectId: 'P1',
    projectName: 'Kuchyňa',
    task: 'Brúsenie',
    date: '2026-09-01',
    startTime: '',
    endTime: '',
    durationMin: 90,
    hourlyRate: 30,
    laborCost: 45,
  })
})

test('neúplnú dvojicu časov odmietne', () => {
  assert.throws(
    () => buildTimeEntryUpdate({ ...base, startTime: '08:00' }, employees, projects),
    /Vyplň začiatok aj koniec/,
  )
})

test('koniec pred začiatkom odmietne', () => {
  assert.throws(
    () => buildTimeEntryUpdate({ ...base, startTime: '10:00', endTime: '09:00' }, employees, projects),
    /Koniec musí byť neskôr/,
  )
})

test('editor predvyplní bratislavský dátum, časy a hodiny', () => {
  assert.deepEqual(timeEntryToForm({
    id: 'H1', employeeId: 'E1', projectId: 'P1', task: 'Brúsenie', date: '2026-09-01',
    startTime: '2026-09-01T06:30:00Z', endTime: '2026-09-01T08:00:00Z', durationMin: 90,
  }), {
    id: 'H1', employeeId: 'E1', projectId: 'P1', task: 'Brúsenie', date: '2026-09-01',
    startTime: '08:30', endTime: '10:00', hours: '1.5',
  })
})

test('editor odvodí chýbajúci dátum v bratislavskom pásme', () => {
  assert.equal(timeEntryToForm({ startTime: '2026-09-01T22:30:00Z' }).date, '2026-09-02')
})

test('interval cez polnoc skončí nasledujúci deň', () => {
  const { entry } = buildTimeEntryUpdate({ ...base, startTime: '23:30', endTime: '01:30' }, employees, projects)

  assert.equal(entry.durationMin, 120)
  assert.equal(entry.startTime, '2026-09-01T21:30:00.000Z')
  assert.equal(entry.endTime, '2026-09-01T23:30:00.000Z')
})


test('interval cez jarnú zmenu času uloží skutočne uplynutú hodinu', () => {
  const { entry } = buildTimeEntryUpdate({ ...base, date: '2026-03-29', startTime: '01:30', endTime: '03:30' }, employees, projects)
  assert.equal(entry.durationMin, 60)
})

test('interval cez jesennú zmenu času uloží tri skutočne uplynuté hodiny', () => {
  const { entry } = buildTimeEntryUpdate({ ...base, date: '2026-10-25', startTime: '01:30', endTime: '03:30' }, employees, projects)
  assert.equal(entry.durationMin, 180)
})
