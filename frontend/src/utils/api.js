/**
 * src/utils/api.js  (ADD THIS FILE TO YOUR FRONTEND)
 *
 * Thin HTTP client that talks to the Express backend.
 * All functions mirror the actions in useAppState.jsx so swapping from
 * pure IndexedDB to server-backed calls is a one-line change per action.
 *
 * Base URL reads from the Vite env variable VITE_API_URL.
 * Set this in your frontend .env:
 *   VITE_API_URL=http://localhost:5000
 */

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // Parse JSON regardless of status so we can read error messages
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const msg = data.error ?? `HTTP ${res.status}`
    const err = new Error(msg)
    err.status = res.status
    err.fields  = data.fields  // express-validator field errors
    throw err
  }

  return data
}

// ── Teachers ─────────────────────────────────────────────
export const teachersApi = {
  getAll:  (params = {}) => request('GET', '/api/teachers?' + new URLSearchParams(params)),
  getOne:  (id)          => request('GET', `/api/teachers/${id}`),
  create:  (teacher)     => request('POST', '/api/teachers', teacher),
  update:  (id, data)    => request('PUT',  `/api/teachers/${id}`, data),
  remove:  (id)          => request('DELETE', `/api/teachers/${id}`),
  getAttendance: (id)    => request('GET', `/api/teachers/${id}/attendance`),
}

// ── Workshops ─────────────────────────────────────────────
export const workshopsApi = {
  getAll:  ()            => request('GET', '/api/workshops'),
  getOne:  (id)          => request('GET', `/api/workshops/${id}`),
  create:  (workshop)    => request('POST', '/api/workshops', workshop),
  update:  (id, data)    => request('PUT',  `/api/workshops/${id}`, data),
  remove:  (id)          => request('DELETE', `/api/workshops/${id}`),
  getAttendance: (id)    => request('GET', `/api/workshops/${id}/attendance`),
}

// ── Attendance ────────────────────────────────────────────
export const attendanceApi = {
  getAll:  (params = {}) => request('GET', '/api/attendance?' + new URLSearchParams(params)),

  /** Single online check-in */
  create:  (record)      => request('POST', '/api/attendance', record),

  /**
   * Bulk sync — sends all pending IndexedDB records to the server.
   * @param {object[]} records  Array of pending attendance objects
   * @returns {{ synced: number, skipped: number, ids: string[] }}
   */
  sync:    (records)     => request('POST', '/api/attendance/sync', { records }),

  remove:  (id)          => request('DELETE', `/api/attendance/${id}`),
}

// ── Dashboard ─────────────────────────────────────────────
export const dashboardApi = {
  get:                  () => request('GET', '/api/dashboard'),
  attendanceByWorkshop: () => request('GET', '/api/dashboard/attendance-by-workshop'),
}
