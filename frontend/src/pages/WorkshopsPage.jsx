import { useState, useMemo } from 'react'
import { useApp } from '../hooks/useAppState.jsx'
import { uid, fmtDate } from '../utils/helpers.js'
import { IconPlus, IconX, IconSearch, IconTrash, IconEvent, IconLocation } from '../components/Icons.jsx'

export default function WorkshopsPage() {
  const { state, addWorkshop, removeWorkshop, toast } = useApp()
  const { workshops, attendance } = state

  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return [...workshops]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter(w => !q || w.name.toLowerCase().includes(q) || w.location.toLowerCase().includes(q))
  }, [workshops, search])

  const handleDelete = async (w) => {
    if (!confirm(`Delete workshop "${w.name}"? This will not remove attendance records.`)) return
    await removeWorkshop(w.id)
    toast(`"${w.name}" deleted`, 'info')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Workshops</h2>
          <p>{workshops.length} training sessions</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <IconPlus /> Create Workshop
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="filter-bar">
          <div className="search-wrap">
            <IconSearch />
            <input
              type="text"
              placeholder="Search by name or location…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <IconEvent />
            <h3>{workshops.length === 0 ? 'No workshops yet' : 'No results found'}</h3>
            <p>{workshops.length === 0
              ? 'Create your first workshop before taking attendance.'
              : 'Try a different search term.'}
            </p>
            {workshops.length === 0 && (
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                <IconPlus /> Create Workshop
              </button>
            )}
          </div>
        ) : (
          <div className="grid-auto">
            {filtered.map(w => {
              const count = attendance.filter(a => a.workshopId === w.id).length
              const pct = Math.min(100, Math.round((count / w.expectedParticipants) * 100))
              return (
                <div key={w.id} className="card">
                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{w.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--muted)', marginBottom: 2 }}>
                          <IconEvent />{fmtDate(w.date)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--muted)' }}>
                          <IconLocation />{w.location}
                        </div>
                      </div>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(w)} title="Delete">
                        <IconTrash />
                      </button>
                    </div>

                    <div className="divider" />

                    {/* Facilitators */}
                    {w.facilitators.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Facilitators</div>
                        <div className="tag-list">
                          {w.facilitators.map(f => <span key={f} className="tag">{f}</span>)}
                        </div>
                      </div>
                    )}

                    {/* Attendance progress */}
                    <div className="progress-wrap">
                      <div className="progress-label">
                        <span style={{ fontSize: 13 }}>Attendance</span>
                        <span style={{ fontSize: 13 }}><strong>{count}</strong> / {w.expectedParticipants}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showForm && <WorkshopModal onClose={() => setShowForm(false)} addWorkshop={addWorkshop} toast={toast} />}
    </div>
  )
}

/* ── Workshop Modal ─────────────────────────────────── */
function WorkshopModal({ onClose, addWorkshop, toast }) {
  const [form, setForm] = useState({
    name: '', date: '', location: '', expectedParticipants: '', facilitatorInput: '', facilitators: [],
  })
  const [errors, setErrors] = useState({})

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const addFacilitator = () => {
    const name = form.facilitatorInput.trim()
    if (!name || form.facilitators.includes(name)) return
    set('facilitators', [...form.facilitators, name])
    set('facilitatorInput', '')
  }

  const removeFacilitator = name => set('facilitators', form.facilitators.filter(f => f !== name))

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!form.date) e.date = 'Required'
    if (!form.location.trim()) e.location = 'Required'
    const ep = parseInt(form.expectedParticipants)
    if (isNaN(ep) || ep < 1) e.expectedParticipants = 'Enter a valid number'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    await addWorkshop({
      id: uid(),
      name: form.name.trim(),
      date: form.date,
      location: form.location.trim(),
      facilitators: form.facilitators,
      expectedParticipants: parseInt(form.expectedParticipants),
      createdAt: new Date().toISOString(),
    })
    toast(`Workshop "${form.name}" created`)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Create Workshop</h3>
          <button className="modal-close" onClick={onClose}><IconX /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Workshop Name</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Term 2 Pedagogy Training" className={errors.name ? 'input-error' : ''} />
            {errors.name && <span className="error-msg">{errors.name}</span>}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className={errors.date ? 'input-error' : ''} />
              {errors.date && <span className="error-msg">{errors.date}</span>}
            </div>
            <div className="form-group">
              <label>Expected Participants</label>
              <input type="number" value={form.expectedParticipants} onChange={e => set('expectedParticipants', e.target.value)}
                placeholder="e.g. 40" className={errors.expectedParticipants ? 'input-error' : ''} />
              {errors.expectedParticipants && <span className="error-msg">{errors.expectedParticipants}</span>}
            </div>
          </div>
          <div className="form-group">
            <label>Location</label>
            <input type="text" value={form.location} onChange={e => set('location', e.target.value)}
              placeholder="e.g. Harare City Library" className={errors.location ? 'input-error' : ''} />
            {errors.location && <span className="error-msg">{errors.location}</span>}
          </div>
          <div className="form-group">
            <label>Facilitators</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={form.facilitatorInput}
                onChange={e => set('facilitatorInput', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addFacilitator()}
                placeholder="Type name and press Enter" style={{ flex: 1 }} />
              <button className="btn btn-secondary btn-sm" onClick={addFacilitator}>Add</button>
            </div>
            {form.facilitators.length > 0 && (
              <div className="tag-list" style={{ marginTop: 8 }}>
                {form.facilitators.map(f => (
                  <span key={f} className="tag" style={{ cursor: 'pointer' }} onClick={() => removeFacilitator(f)}>
                    {f} ×
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Create Workshop</button>
        </div>
      </div>
    </div>
  )
}
