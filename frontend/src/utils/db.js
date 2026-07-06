import { openDB } from 'idb'

const DB_NAME = 'uncommon-training'
const DB_VERSION = 1

let _db = null

async function getDB() {
  if (_db) return _db
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Teachers
      const teachers = db.createObjectStore('teachers', { keyPath: 'id' })
      teachers.createIndex('region', 'region')
      teachers.createIndex('bootcamp', 'bootcamp')

      // Workshops
      const workshops = db.createObjectStore('workshops', { keyPath: 'id' })
      workshops.createIndex('date', 'date')

      // Attendance
      const attendance = db.createObjectStore('attendance', { keyPath: 'id' })
      attendance.createIndex('workshopId', 'workshopId')
      attendance.createIndex('teacherId', 'teacherId')
      attendance.createIndex('syncStatus', 'syncStatus')
    },
  })
  return _db
}

// ── Teachers ────────────────────────────────────────────
export async function saveTeacher(teacher) {
  const db = await getDB()
  await db.put('teachers', teacher)
}
export async function getAllTeachers() {
  const db = await getDB()
  return db.getAll('teachers')
}
export async function getTeacher(id) {
  const db = await getDB()
  return db.get('teachers', id)
}
export async function deleteTeacher(id) {
  const db = await getDB()
  await db.delete('teachers', id)
}

// ── Workshops ───────────────────────────────────────────
export async function saveWorkshop(workshop) {
  const db = await getDB()
  await db.put('workshops', workshop)
}
export async function getAllWorkshops() {
  const db = await getDB()
  return db.getAll('workshops')
}
export async function deleteWorkshop(id) {
  const db = await getDB()
  await db.delete('workshops', id)
}

// ── Attendance ──────────────────────────────────────────
export async function saveAttendance(record) {
  const db = await getDB()
  await db.put('attendance', record)
}
export async function getAllAttendance() {
  const db = await getDB()
  return db.getAll('attendance')
}
export async function getAttendanceByWorkshop(workshopId) {
  const db = await getDB()
  return db.getAllFromIndex('attendance', 'workshopId', workshopId)
}
export async function getPendingAttendance() {
  const db = await getDB()
  return db.getAllFromIndex('attendance', 'syncStatus', 'pending')
}
export async function markSynced(id) {
  const db = await getDB()
  const rec = await db.get('attendance', id)
  if (rec) { rec.syncStatus = 'synced'; await db.put('attendance', rec) }
}
