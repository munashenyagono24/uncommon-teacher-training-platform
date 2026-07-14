/*import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import {
  getAllTeachers, saveTeacher, deleteTeacher,
  getAllWorkshops, saveWorkshop, deleteWorkshop,
  getAllAttendance, saveAttendance,
  getPendingAttendance, markSynced,
} from '../utils/db.js'

const Ctx = createContext(null)

const init = {
  teachers:   [],
  workshops:  [],
  attendance: [],
  isOnline:   navigator.onLine,
  pending:    0,
  toasts:     [],
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return {
        ...state,
        teachers:   action.teachers,
        workshops:  action.workshops,
        attendance: action.attendance,
        pending:    action.attendance.filter(a => a.syncStatus === 'pending').length,
      }
    case 'ADD_TEACHER':
      return { ...state, teachers: [...state.teachers, action.teacher] }
    case 'DEL_TEACHER':
      return { ...state, teachers: state.teachers.filter(t => t.id !== action.id) }
    case 'ADD_WORKSHOP':
      return { ...state, workshops: [...state.workshops, action.workshop] }
    case 'DEL_WORKSHOP':
      return { ...state, workshops: state.workshops.filter(w => w.id !== action.id) }
    case 'ADD_ATTENDANCE': {
      const next = [...state.attendance, action.record]
      return { ...state, attendance: next, pending: next.filter(a => a.syncStatus === 'pending').length }
    }
    case 'SYNC_DONE': {
      const synced = state.attendance.map(a => ({ ...a, syncStatus: 'synced' }))
      return { ...state, attendance: synced, pending: 0 }
    }
    case 'SET_ONLINE':
      return { ...state, isOnline: action.val }
    case 'TOAST_ADD':
      return { ...state, toasts: [...state.toasts, action.toast] }
    case 'TOAST_DEL':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) }
    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, init)

  // Load from IndexedDB on mount
  useEffect(() => {
    ;(async () => {
      const [teachers, workshops, attendance] = await Promise.all([
        getAllTeachers(), getAllWorkshops(), getAllAttendance(),
      ])
      dispatch({ type: 'LOAD', teachers, workshops, attendance })
    })()
  }, [])

  // Online/offline listener
  useEffect(() => {
    const on  = () => { dispatch({ type: 'SET_ONLINE', val: true });  syncPending() }
    const off = () =>   dispatch({ type: 'SET_ONLINE', val: false })
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // Toast helper
  const toast = useCallback((msg, type = 'success') => {
    const id = Math.random().toString(36).slice(2)
    dispatch({ type: 'TOAST_ADD', toast: { id, msg, type } })
    setTimeout(() => dispatch({ type: 'TOAST_DEL', id }), 3500)
  }, [])

  // Actions
  async function addTeacher(teacher) {
    await saveTeacher(teacher)
    dispatch({ type: 'ADD_TEACHER', teacher })
  }
  async function removeTeacher(id) {
    await deleteTeacher(id)
    dispatch({ type: 'DEL_TEACHER', id })
  }
  async function addWorkshop(workshop) {
    await saveWorkshop(workshop)
    dispatch({ type: 'ADD_WORKSHOP', workshop })
  }
  async function removeWorkshop(id) {
    await deleteWorkshop(id)
    dispatch({ type: 'DEL_WORKSHOP', id })
  }
  async function recordAttendance(record) {
    await saveAttendance(record)
    dispatch({ type: 'ADD_ATTENDANCE', record })
  }
  async function syncPending() {
    const pending = await getPendingAttendance()
    for (const r of pending) await markSynced(r.id)
    dispatch({ type: 'SYNC_DONE' })
    if (pending.length > 0) toast(`${pending.length} records synced`, 'success')
  }

  return (
    <Ctx.Provider value={{ state, toast, addTeacher, removeTeacher, addWorkshop, removeWorkshop, recordAttendance, syncPending }}>
      {children}
    </Ctx.Provider>
  )
}

export function useApp() {
  return useContext(Ctx)
}
*/









/**
 * src/hooks/useAppState.jsx  — UPDATED VERSION (replace the original)
 *
 * Changes from v1:
 *  • On mount, loads data from the backend API (not just IndexedDB).
 *    IndexedDB is still written to so the app works offline immediately.
 *  • addTeacher / addWorkshop POST to the API in addition to IndexedDB.
 *  • recordAttendance POSTs to the API when online; stores locally when offline.
 *  • syncPending calls POST /api/attendance/sync with all pending records.
 *
 * If the API call fails (network error, server down) the operation still
 * succeeds locally — the user never loses data.
 */





/* ----- second edition of the hook, with API integration ----- */
/*
import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import {
  getAllTeachers, saveTeacher, deleteTeacher,
  getAllWorkshops, saveWorkshop, deleteWorkshop,
  getAllAttendance, saveAttendance,
  getPendingAttendance, markSynced,
} from '../utils/db.js'
import { teachersApi, workshopsApi, attendanceApi } from '../utils/api.js'

const Ctx = createContext(null)

const init = {
  teachers:   [],
  workshops:  [],
  attendance: [],
  isOnline:   navigator.onLine,
  pending:    0,
  toasts:     [],
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return {
        ...state,
        teachers:   action.teachers,
        workshops:  action.workshops,
        attendance: action.attendance,
        pending:    action.attendance.filter(a => a.syncStatus === 'pending').length,
      }
    case 'ADD_TEACHER':
      return { ...state, teachers: [...state.teachers, action.teacher] }
    case 'DEL_TEACHER':
      return { ...state, teachers: state.teachers.filter(t => t.id !== action.id) }
    case 'ADD_WORKSHOP':
      return { ...state, workshops: [...state.workshops, action.workshop] }
    case 'DEL_WORKSHOP':
      return { ...state, workshops: state.workshops.filter(w => w.id !== action.id) }
    case 'ADD_ATTENDANCE': {
      const next = [...state.attendance, action.record]
      return { ...state, attendance: next, pending: next.filter(a => a.syncStatus === 'pending').length }
    }
    case 'SYNC_DONE': {
      const synced = state.attendance.map(a => ({ ...a, syncStatus: 'synced' }))
      return { ...state, attendance: synced, pending: 0 }
    }
    case 'SET_ONLINE':
      return { ...state, isOnline: action.val }
    case 'TOAST_ADD':
      return { ...state, toasts: [...state.toasts, action.toast] }
    case 'TOAST_DEL':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) }
    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, init)

  // ── Mount: try API first, fall back to IndexedDB ──────
  useEffect(() => {
    ;(async () => {
      try {
        // Prefer fresh server data when online
        if (navigator.onLine) {
          const [teachers, workshops, attendance] = await Promise.all([
            teachersApi.getAll(),
            workshopsApi.getAll(),
            attendanceApi.getAll(),
          ])
          // Persist to IndexedDB so offline still works
          for (const t of teachers)   await saveTeacher(t)
          for (const w of workshops)  await saveWorkshop(w)
          for (const a of attendance) await saveAttendance({ ...a, syncStatus: 'synced' })
          dispatch({ type: 'LOAD', teachers, workshops, attendance: attendance.map(a => ({ ...a, syncStatus: 'synced' })) })
          return
        }
      } catch (_) {
        // API not reachable — fall through to IndexedDB
      }
      // Offline / API down: load from IndexedDB
      const [teachers, workshops, attendance] = await Promise.all([
        getAllTeachers(), getAllWorkshops(), getAllAttendance(),
      ])
      dispatch({ type: 'LOAD', teachers, workshops, attendance })
    })()
  }, [])

  // ── Online/offline listener ───────────────────────────
  useEffect(() => {
    const on  = () => { dispatch({ type: 'SET_ONLINE', val: true });  syncPending() }
    const off = () =>   dispatch({ type: 'SET_ONLINE', val: false })
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // ── Toast helper ──────────────────────────────────────
  const toast = useCallback((msg, type = 'success') => {
    const id = Math.random().toString(36).slice(2)
    dispatch({ type: 'TOAST_ADD', toast: { id, msg, type } })
    setTimeout(() => dispatch({ type: 'TOAST_DEL', id }), 3500)
  }, [])

  // ── Actions ───────────────────────────────────────────

  async function addTeacher(teacher) {
    // Always write locally first (optimistic)
    await saveTeacher(teacher)
    dispatch({ type: 'ADD_TEACHER', teacher })
    // Then try to persist to server
    if (navigator.onLine) {
      try { await teachersApi.create(teacher) }
      catch (err) { console.warn('API: teacher create failed', err.message) }
    }
  }

  async function removeTeacher(id) {
    await deleteTeacher(id)
    dispatch({ type: 'DEL_TEACHER', id })
    if (navigator.onLine) {
      try { await teachersApi.remove(id) }
      catch (err) { console.warn('API: teacher delete failed', err.message) }
    }
  }

  async function addWorkshop(workshop) {
    await saveWorkshop(workshop)
    dispatch({ type: 'ADD_WORKSHOP', workshop })
    if (navigator.onLine) {
      try { await workshopsApi.create(workshop) }
      catch (err) { console.warn('API: workshop create failed', err.message) }
    }
  }

  async function removeWorkshop(id) {
    await deleteWorkshop(id)
    dispatch({ type: 'DEL_WORKSHOP', id })
    if (navigator.onLine) {
      try { await workshopsApi.remove(id) }
      catch (err) { console.warn('API: workshop delete failed', err.message) }
    }
  }

  async function recordAttendance(record) {
    // Determine sync status based on connectivity
    const isOnline = navigator.onLine
    const toSave   = { ...record, syncStatus: isOnline ? 'synced' : 'pending' }

    await saveAttendance(toSave)
    dispatch({ type: 'ADD_ATTENDANCE', record: toSave })

    if (isOnline) {
      try { await attendanceApi.create(toSave) }
      catch (err) {
        // Duplicate (already checked in server-side) — not an error to show user
        if (err.status !== 409) console.warn('API: attendance create failed', err.message)
      }
    }
  }

  async function syncPending() {
    const pending = await getPendingAttendance()
    if (pending.length === 0) return

    try {
      const { synced } = await attendanceApi.sync(pending)
      // Mark synced in IndexedDB
      for (const r of pending) await markSynced(r.id)
      dispatch({ type: 'SYNC_DONE' })
      if (synced > 0) toast(`${synced} record${synced > 1 ? 's' : ''} synced`, 'success')
    } catch (err) {
      console.warn('Sync failed — will retry on next reconnect:', err.message)
    }
  }

  return (
    <Ctx.Provider value={{ state, toast, addTeacher, removeTeacher, addWorkshop, removeWorkshop, recordAttendance, syncPending }}>
      {children}
    </Ctx.Provider>
  )
}

export function useApp() {
  return useContext(Ctx)
}
*/


import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import {
  getAllTeachers, saveTeacher, deleteTeacher,
  getAllWorkshops, saveWorkshop, deleteWorkshop,
  getAllAttendance, saveAttendance,
  getPendingAttendance, markSynced,
  getAllLocations, saveLocation, deleteLocation,
  getAllFacilitators, saveFacilitator, deleteFacilitator,
  getAllMinistryContacts, saveMinistryContact, deleteMinistryContact,
  getAllFundRequisitions, saveFundRequisition, deleteFundRequisition,
} from '../utils/db.js'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

async function apiFetch(method, path, body) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      console.error(`API ${method} ${path} failed ${res.status}:`, data)
      throw new Error(data.error ?? `HTTP ${res.status}`)
    }
    return res.json()
  } catch (err) {
    console.warn(`API call failed (${method} ${path}):`, err.message)
    throw err
  }
}

const Ctx = createContext(null)

const init = {
  teachers: [], workshops: [], attendance: [],
  locations: [], facilitators: [], ministryContacts: [], fundRequisitions: [],
  isOnline: navigator.onLine, pending: 0, toasts: [],
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return {
        ...state,
        teachers:   action.teachers,
        workshops:  action.workshops,
        attendance: action.attendance,
        locations:  action.locations || [],
        facilitators: action.facilitators || [],
        ministryContacts: action.ministryContacts || [],
        fundRequisitions: action.fundRequisitions || [],
        pending:    action.attendance.filter(a => a.syncStatus === 'pending').length,
      }
    case 'ADD_TEACHER':
      return { ...state, teachers: [...state.teachers, action.teacher] }
    case 'DEL_TEACHER':
      return { ...state, teachers: state.teachers.filter(t => t.id !== action.id) }
    case 'ADD_WORKSHOP':
      return { ...state, workshops: [...state.workshops.filter(w => w.id !== action.workshop.id), action.workshop] }
    case 'UPDATE_WORKSHOP':
      return { ...state, workshops: state.workshops.map(w => w.id === action.workshop.id ? action.workshop : w) }
    case 'DEL_WORKSHOP':
      return { ...state, workshops: state.workshops.filter(w => w.id !== action.id) }
    case 'ADD_ATTENDANCE': {
      const next = [...state.attendance, action.record]
      return { ...state, attendance: next, pending: next.filter(a => a.syncStatus === 'pending').length }
    }
    case 'SYNC_DONE':
      return { ...state, attendance: state.attendance.map(a => ({ ...a, syncStatus: 'synced' })), pending: 0 }
    case 'ADD_LOCATION':
      return { ...state, locations: [...state.locations.filter(l => l.id !== action.location.id), action.location] }
    case 'DEL_LOCATION':
      return { ...state, locations: state.locations.filter(l => l.id !== action.id) }
    case 'ADD_FACILITATOR':
      return { ...state, facilitators: [...state.facilitators.filter(f => f.id !== action.facilitator.id), action.facilitator] }
    case 'DEL_FACILITATOR':
      return { ...state, facilitators: state.facilitators.filter(f => f.id !== action.id) }
    case 'ADD_MINISTRY_CONTACT':
      return { ...state, ministryContacts: [...state.ministryContacts.filter(m => m.id !== action.contact.id), action.contact] }
    case 'DEL_MINISTRY_CONTACT':
      return { ...state, ministryContacts: state.ministryContacts.filter(m => m.id !== action.id) }
    case 'ADD_FUND_REQUISITION':
      return { ...state, fundRequisitions: [...state.fundRequisitions.filter(r => r.id !== action.requisition.id), action.requisition] }
    case 'DEL_FUND_REQUISITION':
      return { ...state, fundRequisitions: state.fundRequisitions.filter(r => r.id !== action.id) }
    case 'SET_ONLINE':
      return { ...state, isOnline: action.val }
    case 'TOAST_ADD':
      return { ...state, toasts: [...state.toasts, action.toast] }
    case 'TOAST_DEL':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) }
    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, init)

  useEffect(() => {
    ;(async () => {
      // Always load from IndexedDB first so UI is instant
      const [teachers, workshops, attendance, locations, facilitators, ministryContacts, fundRequisitions] = await Promise.all([
        getAllTeachers(), getAllWorkshops(), getAllAttendance(),
        getAllLocations(), getAllFacilitators(), getAllMinistryContacts(), getAllFundRequisitions(),
      ])
      dispatch({ type: 'LOAD', teachers, workshops, attendance, locations, facilitators, ministryContacts, fundRequisitions })

      // Then try to refresh from server
      if (navigator.onLine) {
        try {
          const [st, sw, sa, sl, sf, sm, sr] = await Promise.all([
            apiFetch('GET', '/api/teachers'),
            apiFetch('GET', '/api/workshops'),
            apiFetch('GET', '/api/attendance'),
            apiFetch('GET', '/api/locations'),
            apiFetch('GET', '/api/facilitators'),
            apiFetch('GET', '/api/ministry-contacts'),
            apiFetch('GET', '/api/fund-requisitions'),
          ])
          for (const t of st) await saveTeacher(t)
          for (const w of sw) await saveWorkshop(w)
          for (const a of sa) await saveAttendance({ ...a, syncStatus: 'synced' })
          for (const l of sl) await saveLocation(l)
          for (const f of sf) await saveFacilitator(f)
          for (const m of sm) await saveMinistryContact(m)
          for (const r of sr) await saveFundRequisition(r)
          dispatch({ type: 'LOAD', teachers: st, workshops: sw,
            attendance: sa.map(a => ({ ...a, syncStatus: 'synced' })),
            locations: sl, facilitators: sf, ministryContacts: sm, fundRequisitions: sr })
        } catch (err) {
          console.warn('Could not load from server, using local data:', err.message)
        }
      }
    })()
  }, [])

  useEffect(() => {
    const on  = () => { dispatch({ type: 'SET_ONLINE', val: true });  syncPending() }
    const off = () =>   dispatch({ type: 'SET_ONLINE', val: false })
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const toast = useCallback((msg, type = 'success') => {
    const id = Math.random().toString(36).slice(2)
    dispatch({ type: 'TOAST_ADD', toast: { id, msg, type } })
    setTimeout(() => dispatch({ type: 'TOAST_DEL', id }), 3500)
  }, [])

  async function addTeacher(teacher) {
    await saveTeacher(teacher)
    dispatch({ type: 'ADD_TEACHER', teacher })
    if (navigator.onLine) {
      try { await apiFetch('POST', '/api/teachers', teacher) }
      catch (err) { console.warn('Could not save teacher to server:', err.message) }
    }
  }

  async function removeTeacher(id) {
    await deleteTeacher(id)
    dispatch({ type: 'DEL_TEACHER', id })
    if (navigator.onLine) {
      try { await apiFetch('DELETE', `/api/teachers/${id}`) }
      catch (err) { console.warn('Could not delete teacher from server:', err.message) }
    }
  }

  async function addWorkshop(workshop) {
    await saveWorkshop(workshop)
    dispatch({ type: 'ADD_WORKSHOP', workshop })
    if (navigator.onLine) {
      try { await apiFetch('POST', '/api/workshops', workshop) }
      catch (err) { console.warn('Could not save workshop to server:', err.message) }
    }
  }

  async function removeWorkshop(id) {
    await deleteWorkshop(id)
    dispatch({ type: 'DEL_WORKSHOP', id })
    if (navigator.onLine) {
      try { await apiFetch('DELETE', `/api/workshops/${id}`) }
      catch (err) { console.warn('Could not delete workshop from server:', err.message) }
    }
  }

  async function recordAttendance(record) {
    const isOnline = navigator.onLine
    const toSave = { ...record, syncStatus: isOnline ? 'synced' : 'pending' }
    await saveAttendance(toSave)
    dispatch({ type: 'ADD_ATTENDANCE', record: toSave })
    if (isOnline) {
      try { await apiFetch('POST', '/api/attendance', toSave) }
      catch (err) {
        if (!err.message.includes('409'))
          console.warn('Could not save attendance to server:', err.message)
      }
    }
  }

  async function syncPending() {
    const pending = await getPendingAttendance()
    if (pending.length === 0) return
    try {
      const { synced } = await apiFetch('POST', '/api/attendance/sync', { records: pending })
      for (const r of pending) await markSynced(r.id)
      dispatch({ type: 'SYNC_DONE' })
      if (synced > 0) toast(`${synced} record${synced > 1 ? 's' : ''} synced`)
    } catch (err) {
      console.warn('Sync failed, will retry on next reconnect:', err.message)
    }
  }

  async function addLocation(location) {
    await saveLocation(location)
    dispatch({ type: 'ADD_LOCATION', location })
    if (navigator.onLine) {
      try { await apiFetch('POST', '/api/locations', location) }
      catch (err) { console.warn('Could not save location:', err.message) }
    }
  }

  async function removeLocation(id) {
    await deleteLocation(id)
    dispatch({ type: 'DEL_LOCATION', id })
    if (navigator.onLine) {
      try { await apiFetch('DELETE', `/api/locations/${id}`) }
      catch (err) { console.warn('Could not delete location:', err.message) }
    }
  }

  async function addFacilitator(facilitator) {
    await saveFacilitator(facilitator)
    dispatch({ type: 'ADD_FACILITATOR', facilitator })
    if (navigator.onLine) {
      try { await apiFetch('POST', '/api/facilitators', facilitator) }
      catch (err) { console.warn('Could not save facilitator:', err.message) }
    }
  }

  async function removeFacilitator(id) {
    await deleteFacilitator(id)
    dispatch({ type: 'DEL_FACILITATOR', id })
    if (navigator.onLine) {
      try { await apiFetch('DELETE', `/api/facilitators/${id}`) }
      catch (err) { console.warn('Could not delete facilitator:', err.message) }
    }
  }

  async function addMinistryContact(contact) {
    await saveMinistryContact(contact)
    dispatch({ type: 'ADD_MINISTRY_CONTACT', contact })
    if (navigator.onLine) {
      try { await apiFetch('POST', '/api/ministry-contacts', contact) }
      catch (err) { console.warn('Could not save ministry contact:', err.message) }
    }
  }

  async function removeMinistryContact(id) {
    await deleteMinistryContact(id)
    dispatch({ type: 'DEL_MINISTRY_CONTACT', id })
    if (navigator.onLine) {
      try { await apiFetch('DELETE', `/api/ministry-contacts/${id}`) }
      catch (err) { console.warn('Could not delete ministry contact:', err.message) }
    }
  }

  async function addFundRequisition(requisition) {
    await saveFundRequisition(requisition)
    dispatch({ type: 'ADD_FUND_REQUISITION', requisition })
    if (navigator.onLine) {
      try { await apiFetch('POST', '/api/fund-requisitions', requisition) }
      catch (err) { console.warn('Could not save fund requisition:', err.message) }
    }
  }

  async function removeFundRequisition(id) {
    await deleteFundRequisition(id)
    dispatch({ type: 'DEL_FUND_REQUISITION', id })
    if (navigator.onLine) {
      try { await apiFetch('DELETE', `/api/fund-requisitions/${id}`) }
      catch (err) { console.warn('Could not delete fund requisition:', err.message) }
    }
  }

  async function updateWorkshop(workshop) {
    await saveWorkshop(workshop)
    dispatch({ type: 'UPDATE_WORKSHOP', workshop })
    if (navigator.onLine) {
      try { await apiFetch('PUT', `/api/workshops/${workshop.id}`, workshop) }
      catch (err) { console.warn('Could not update workshop:', err.message) }
    }
  }

  return (
    <Ctx.Provider value={{ state, toast, addTeacher, removeTeacher,
      addWorkshop, removeWorkshop, recordAttendance, syncPending,
      addLocation, removeLocation, addFacilitator, removeFacilitator,
      addMinistryContact, removeMinistryContact, addFundRequisition, removeFundRequisition, updateWorkshop }}>
      {children}
    </Ctx.Provider>
  )
}

export function useApp() {
  return useContext(Ctx)
}