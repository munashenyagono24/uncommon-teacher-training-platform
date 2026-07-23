import { openDB } from 'idb'

const DB_NAME = 'uncommon-training'
const DB_VERSION = 2

let _db = null

async function getDB() {
  if (_db) return _db
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      if (oldVersion < 1) {
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
      }
      
      if (oldVersion < 2) {
        // Locations
        if (!db.objectStoreNames.contains('locations')) {
          db.createObjectStore('locations', { keyPath: 'id' })
        }
        // Facilitators
        if (!db.objectStoreNames.contains('facilitators')) {
          db.createObjectStore('facilitators', { keyPath: 'id' })
        }
        // Ministry Contacts
        if (!db.objectStoreNames.contains('ministry_contacts')) {
          db.createObjectStore('ministry_contacts', { keyPath: 'id' })
        }
        // Fund Requisitions
        if (!db.objectStoreNames.contains('fund_requisitions')) {
          db.createObjectStore('fund_requisitions', { keyPath: 'id' })
        }
      }
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

// ── Locations ───────────────────────────────────────────
export async function saveLocation(loc) {
  const db = await getDB()
  await db.put('locations', loc)
}
export async function getAllLocations() {
  const db = await getDB()
  return db.getAll('locations')
}
export async function deleteLocation(id) {
  const db = await getDB()
  await db.delete('locations', id)
}

// ── Facilitators ────────────────────────────────────────
export async function saveFacilitator(fac) {
  const db = await getDB()
  await db.put('facilitators', fac)
}
export async function getAllFacilitators() {
  const db = await getDB()
  return db.getAll('facilitators')
}
export async function deleteFacilitator(id) {
  const db = await getDB()
  await db.delete('facilitators', id)
}

// ── Ministry Contacts ───────────────────────────────────
export async function saveMinistryContact(mc) {
  const db = await getDB()
  await db.put('ministry_contacts', mc)
}
export async function getAllMinistryContacts() {
  const db = await getDB()
  return db.getAll('ministry_contacts')
}
export async function deleteMinistryContact(id) {
  const db = await getDB()
  await db.delete('ministry_contacts', id)
}

// ── Fund Requisitions ───────────────────────────────────
export async function saveFundRequisition(req) {
  const db = await getDB()
  await db.put('fund_requisitions', req)
}
export async function getAllFundRequisitions() {
  const db = await getDB()
  return db.getAll('fund_requisitions')
}
export async function deleteFundRequisition(id) {
  const db = await getDB()
  await db.delete('fund_requisitions', id)
}
