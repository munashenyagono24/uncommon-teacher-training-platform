import { useState, useMemo } from 'react'
import { useApp } from '../hooks/useAppState.jsx'
import { uid, fmtDate } from '../utils/helpers.js'
import { IconPlus, IconX, IconSearch, IconTrash, IconDownload, IconEvent, IconLocation, IconReport, IconCheck } from '../components/Icons.jsx'

export default function RequisitionsPage() {
  const { state, addFundRequisition, removeFundRequisition, addLocation, addFacilitator, addMinistryContact, toast } = useApp()
  const { fundRequisitions, locations, facilitators, ministryContacts } = state

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingRequisition, setEditingRequisition] = useState(null)
  const [selectedReq, setSelectedReq] = useState(null)

  // Filter requisitions
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return [...fundRequisitions]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter(r => {
        const matchQ = !q || r.title.toLowerCase().includes(q) || r.requestedBy.toLowerCase().includes(q)
        const matchStatus = !filterStatus || r.status === filterStatus
        return matchQ && matchStatus
      })
  }, [fundRequisitions, search, filterStatus])

  const handleDelete = async (req) => {
    if (!confirm(`Delete fund requisition "${req.title}"? This will also remove all budget line items.`)) return
    await removeFundRequisition(req.id)
    if (selectedReq?.id === req.id) setSelectedReq(null)
    toast(`"${req.title}" deleted`, 'info')
  }

  const handleEdit = (req) => {
    setEditingRequisition(req)
    setShowForm(true)
  }

  const handleCreateNew = () => {
    setEditingRequisition(null)
    setShowForm(true)
  }

  const handleSelectReq = (req) => {
    setSelectedReq(selectedReq?.id === req.id ? null : req)
  }

  // Helper mapping
  const locationMap = Object.fromEntries(locations.map(l => [l.id, l]))
  const facilitatorMap = Object.fromEntries(facilitators.map(f => [f.id, f]))
  const contactMap = Object.fromEntries(ministryContacts.map(m => [m.id, m]))

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Funds Requisitions</h2>
          <p>{fundRequisitions.length} budgets compiled for training sessions</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleCreateNew}>
            <IconPlus /> Compile Requisition
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div className="filter-bar" style={{ gap: 10, marginBottom: 16 }}>
          <div className="search-wrap" style={{ flex: 1, minWidth: 200 }}>
            <IconSearch />
            <input
              type="text"
              placeholder="Search by title or requested by…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 150 }}>
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>
        </div>

        <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
          {/* Left List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.length === 0 ? (
              <div className="empty-state">
                <IconReport />
                <h3>No requisitions found</h3>
                <p>Compile budget items, link facilitators and ministry contacts in a requisition first.</p>
              </div>
            ) : (
              filtered.map(r => {
                const loc = locationMap[r.locationId]?.name ?? 'Unspecified Location'
                const isSelected = selectedReq?.id === r.id
                return (
                  <div 
                    key={r.id} 
                    className={`card ${isSelected ? 'card-selected' : ''}`} 
                    style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}
                    onClick={() => handleSelectReq(r)}
                  >
                    <div className="card-body" style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <span className={`badge ${
                            r.status === 'approved' ? 'badge-green' : r.status === 'pending' ? 'badge-gold' : 'badge-gray'
                          }`} style={{ marginBottom: 6, display: 'inline-block' }}>
                            {r.status}
                          </span>
                          <h4 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>{r.title}</h4>
                          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 6px' }}>
                            Requested by: <strong>{r.requestedBy}</strong>
                          </p>
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)' }}>
                            <span>📅 {fmtDate(r.startDate)} {r.endDate && r.endDate !== r.startDate ? ` - ${fmtDate(r.endDate)}` : ''}</span>
                            <span>📍 {loc}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green-dark)' }}>
                            {r.currency} {Number(r.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(r)} style={{ padding: '4px 8px' }}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r)} style={{ padding: '4px 8px' }}><IconTrash /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Right Preview */}
          <div className="card" style={{ position: 'sticky', top: 20 }}>
            <div className="card-body" style={{ padding: 24 }}>
              {!selectedReq ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                  <IconReport style={{ width: 48, height: 48, marginBottom: 12, color: 'var(--border)' }} />
                  <h3>No Requisition Selected</h3>
                  <p style={{ fontSize: 14 }}>Click a requisition on the left to view full budget itemized details, facilitators, and Ministry delegates.</p>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 16 }}>
                    <div>
                      <span className={`badge ${
                        selectedReq.status === 'approved' ? 'badge-green' : selectedReq.status === 'pending' ? 'badge-gold' : 'badge-gray'
                      }`} style={{ marginBottom: 8 }}>
                        {selectedReq.status}
                      </span>
                      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{selectedReq.title}</h3>
                      <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                        By <strong>{selectedReq.requestedBy}</strong> on {fmtDate(selectedReq.createdAt)}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--green-dark)' }}>
                        {selectedReq.currency} {Number(selectedReq.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--muted)' }}>total requested budget</p>
                    </div>
                  </div>

                  {/* Dates / Location */}
                  <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)' }}>Workshop Dates</div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>
                        {fmtDate(selectedReq.startDate)} {selectedReq.endDate && selectedReq.endDate !== selectedReq.startDate ? ` to ${fmtDate(selectedReq.endDate)}` : ''}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)' }}>Target Venue</div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>
                        {locationMap[selectedReq.locationId]?.name ?? 'Unspecified Location'}
                        {locationMap[selectedReq.locationId]?.address && <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block' }}>{locationMap[selectedReq.locationId]?.address}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Facilitators and Contacts */}
                  <div className="grid-2" style={{ gap: 16, borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Facilitators</div>
                      {selectedReq.facilitatorIds.length === 0 ? (
                        <span style={{ fontSize: 13, color: 'var(--muted)' }}>None assigned</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {selectedReq.facilitatorIds.map(fid => {
                            const fac = facilitatorMap[fid]
                            return fac ? (
                              <div key={fid} style={{ fontSize: 13, padding: '4px 8px', background: 'var(--bg)', borderRadius: 4 }}>
                                <strong>{fac.name}</strong> <span style={{ color: 'var(--muted)', fontSize: 11 }}>({fac.role ?? 'Facilitator'})</span>
                              </div>
                            ) : null
                          })}
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Ministry Delegations</div>
                      {selectedReq.ministryContactIds.length === 0 ? (
                        <span style={{ fontSize: 13, color: 'var(--muted)' }}>None linked</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {selectedReq.ministryContactIds.map(mid => {
                            const mc = contactMap[mid]
                            return mc ? (
                              <div key={mid} style={{ fontSize: 13, padding: '4px 8px', background: 'var(--bg)', borderRadius: 4 }}>
                                <strong>{mc.name}</strong> <span style={{ color: 'var(--muted)', fontSize: 11 }}>({mc.title ?? 'Delegate'})</span>
                              </div>
                            ) : null
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Budget items */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Budget Itemized Line items</div>
                    {selectedReq.lineItems.length === 0 ? (
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>No items created</span>
                    ) : (
                      <div className="table-wrap" style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                        <table style={{ fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: 'var(--bg)' }}>
                              <th style={{ padding: '6px 8px' }}>Category</th>
                              <th style={{ padding: '6px 8px' }}>Description</th>
                              <th style={{ padding: '6px 8px', textAlign: 'right' }}>Qty</th>
                              <th style={{ padding: '6px 8px', textAlign: 'right' }}>Unit Cost</th>
                              <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedReq.lineItems.map(item => (
                              <tr key={item.id}>
                                <td style={{ padding: '6px 8px' }}>{item.category}</td>
                                <td style={{ padding: '6px 8px' }}>{item.description}</td>
                                <td style={{ padding: '6px 8px', textAlign: 'right' }}>{item.quantity}</td>
                                <td style={{ padding: '6px 8px', textAlign: 'right' }}>{item.unitCost.toFixed(2)}</td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{item.amount.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {selectedReq.notes && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>Notes</div>
                      <p style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap', background: 'var(--gold-light)', padding: 12, borderRadius: 6 }}>
                        {selectedReq.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <RequisitionModal
          onClose={() => setShowForm(false)}
          requisition={editingRequisition}
          addFundRequisition={addFundRequisition}
          locations={locations}
          addLocation={addLocation}
          facilitators={facilitators}
          addFacilitator={addFacilitator}
          ministryContacts={ministryContacts}
          addMinistryContact={addMinistryContact}
          toast={toast}
        />
      )}
    </div>
  )
}

/* ── Requisition Creation/Edit Modal ────────────────────────────── */
function RequisitionModal({
  onClose, requisition, addFundRequisition,
  locations, addLocation,
  facilitators, addFacilitator,
  ministryContacts, addMinistryContact,
  toast
}) {
  const [title, setTitle] = useState(requisition?.title ?? '')
  const [requestedBy, setRequestedBy] = useState(requisition?.requestedBy ?? '')
  const [locationId, setLocationId] = useState(requisition?.locationId ?? '')
  const [startDate, setStartDate] = useState(requisition?.startDate ?? '')
  const [endDate, setEndDate] = useState(requisition?.endDate ?? '')
  const [currency, setCurrency] = useState(requisition?.currency ?? 'USD')
  const [notes, setNotes] = useState(requisition?.notes ?? '')
  const [status, setStatus] = useState(requisition?.status ?? 'draft')
  
  const [facilitatorIds, setFacilitatorIds] = useState(requisition?.facilitatorIds ?? [])
  const [ministryContactIds, setMinistryContactIds] = useState(requisition?.ministryContactIds ?? [])
  
  const [lineItems, setLineItems] = useState(requisition?.lineItems ?? [])
  const [errors, setErrors] = useState({})

  // Inline forms states
  const [showLocForm, setShowLocForm] = useState(false)
  const [locForm, setLocForm] = useState({ name: '', region: '', address: '' })

  const [showFacForm, setShowFacForm] = useState(false)
  const [facForm, setFacForm] = useState({ name: '', email: '', phone: '', role: '', organization: '' })

  const [showContactForm, setShowContactForm] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', title: '', ministry: '', email: '', phone: '' })

  // Calculator
  const totalAmount = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitCost || 0)), 0)
  }, [lineItems])

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { id: uid(), category: 'Accommodation', description: '', quantity: 1, unitCost: 0, amount: 0 }])
  }

  const handleUpdateLineItem = (id, key, val) => {
    setLineItems(lineItems.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [key]: val }
      if (key === 'quantity' || key === 'unitCost') {
        const q = key === 'quantity' ? Number(val) : Number(item.quantity)
        const u = key === 'unitCost' ? Number(val) : Number(item.unitCost)
        updated.amount = q * u
      }
      return updated
    }))
  }

  const handleRemoveLineItem = (id) => {
    setLineItems(lineItems.filter(item => item.id !== id))
  }

  // Inline adds
  const handleAddLocation = async () => {
    if (!locForm.name.trim()) return alert('Location name is required')
    const loc = { id: uid(), name: locForm.name.trim(), region: locForm.region, address: locForm.address, createdAt: new Date().toISOString() }
    await addLocation(loc)
    setLocationId(loc.id)
    setShowLocForm(false)
    setLocForm({ name: '', region: '', address: '' })
    toast(`Location "${loc.name}" created`)
  }

  const handleAddFacilitator = async () => {
    if (!facForm.name.trim()) return alert('Name is required')
    const fac = { id: uid(), name: facForm.name.trim(), email: facForm.email, phone: facForm.phone, role: facForm.role, organization: facForm.organization, createdAt: new Date().toISOString() }
    await addFacilitator(fac)
    setFacilitatorIds([...facilitatorIds, fac.id])
    setShowFacForm(false)
    setFacForm({ name: '', email: '', phone: '', role: '', organization: '' })
    toast(`Facilitator "${fac.name}" registered`)
  }

  const handleAddContact = async () => {
    if (!contactForm.name.trim()) return alert('Name is required')
    const mc = { id: uid(), name: contactForm.name.trim(), title: contactForm.title, ministry: contactForm.ministry, email: contactForm.email, phone: contactForm.phone, createdAt: new Date().toISOString() }
    await addMinistryContact(mc)
    setMinistryContactIds([...ministryContactIds, mc.id])
    setShowContactForm(false)
    setContactForm({ name: '', title: '', ministry: '', email: '', phone: '' })
    toast(`Ministry contact "${mc.name}" created`)
  }

  const handleToggleFacilitator = (fid) => {
    if (facilitatorIds.includes(fid)) {
      setFacilitatorIds(facilitatorIds.filter(id => id !== fid))
    } else {
      setFacilitatorIds([...facilitatorIds, fid])
    }
  }

  const handleToggleContact = (cid) => {
    if (ministryContactIds.includes(cid)) {
      setMinistryContactIds(ministryContactIds.filter(id => id !== cid))
    } else {
      setMinistryContactIds([...ministryContactIds, cid])
    }
  }

  const validate = () => {
    const e = {}
    if (!title.trim()) e.title = 'Title is required'
    if (!requestedBy.trim()) e.requestedBy = 'Requester name is required'
    if (!startDate) e.startDate = 'Start date is required'
    if (!locationId) e.locationId = 'Select a venue location'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    const id = requisition?.id || uid()
    const now = new Date().toISOString()
    const payload = {
      id,
      title: title.trim(),
      requestedBy: requestedBy.trim(),
      locationId,
      startDate,
      endDate: endDate || startDate,
      currency,
      totalAmount,
      notes: notes.trim(),
      status,
      facilitatorIds,
      ministryContactIds,
      lineItems: lineItems.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        unitCost: Number(item.unitCost),
        amount: Number(item.quantity) * Number(item.unitCost)
      })),
      createdAt: requisition?.createdAt || now,
      updatedAt: now
    }
    await addFundRequisition(payload)
    toast(requisition ? 'Requisition updated' : 'Requisition compiled successfully')
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 840, width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h3>{requisition ? 'Edit Budget Requisition' : 'Compile Budget Requisition'}</h3>
          <button className="modal-close" onClick={onClose}><IconX /></button>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto', paddingRight: 10 }}>
          {/* Main Info */}
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Requisition Title</label>
              <input 
                type="text" 
                value={title} 
                onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: '' })) }}
                placeholder="e.g. Harare Term 2 Pedagogy Budget" 
                className={errors.title ? 'input-error' : ''}
              />
              {errors.title && <span className="error-msg">{errors.title}</span>}
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Requested By</label>
              <input 
                type="text" 
                value={requestedBy} 
                onChange={e => { setRequestedBy(e.target.value); setErrors(p => ({ ...p, requestedBy: '' })) }}
                placeholder="Anesu" 
                className={errors.requestedBy ? 'input-error' : ''}
              />
              {errors.requestedBy && <span className="error-msg">{errors.requestedBy}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={e => { setStartDate(e.target.value); setErrors(p => ({ ...p, startDate: '' })) }}
                className={errors.startDate ? 'input-error' : ''}
              />
              {errors.startDate && <span className="error-msg">{errors.startDate}</span>}
            </div>
            <div className="form-group">
              <label>End Date (Optional)</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}>
                <option value="USD">USD ($)</option>
                <option value="ZiG">ZiG</option>
                <option value="ZAR">ZAR (R)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
              </select>
            </div>
          </div>

          {/* Location Section */}
          <div className="form-group" style={{ background: '#f8f9fa', padding: 12, borderRadius: 8, border: '1px dashed #ced4da', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ margin: 0, fontWeight: 700 }}>Venue Location</label>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                style={{ padding: '3px 8px', fontSize: 11 }} 
                onClick={() => setShowLocForm(!showLocForm)}
              >
                {showLocForm ? 'Cancel' : '+ New Location'}
              </button>
            </div>

            {showLocForm ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', background: '#fff', padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}>
                <input 
                  type="text" 
                  value={locForm.name} 
                  onChange={e => setLocForm({ ...locForm, name: e.target.value })}
                  placeholder="Harare Central Library" 
                  style={{ flex: 1, minWidth: 150, padding: 6, fontSize: 13 }}
                />
                <input 
                  type="text" 
                  value={locForm.region} 
                  onChange={e => setLocForm({ ...locForm, region: e.target.value })}
                  placeholder="Region (e.g. Harare)" 
                  style={{ flex: 1, minWidth: 120, padding: 6, fontSize: 13 }}
                />
                <input 
                  type="text" 
                  value={locForm.address} 
                  onChange={e => setLocForm({ ...locForm, address: e.target.value })}
                  placeholder="Address details" 
                  style={{ flex: 2, minWidth: 180, padding: 6, fontSize: 13 }}
                />
                <button type="button" className="btn btn-primary btn-sm" onClick={handleAddLocation}>Add Location</button>
              </div>
            ) : (
              <select 
                value={locationId} 
                onChange={e => { setLocationId(e.target.value); setErrors(p => ({ ...p, locationId: '' })) }}
                className={errors.locationId ? 'input-error' : ''}
              >
                <option value="">Select workshop location venue…</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name} ({loc.region})</option>
                ))}
              </select>
            )}
            {errors.locationId && <span className="error-msg">{errors.locationId}</span>}
          </div>

          {/* People involved select checklists */}
          <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
            {/* Facilitators Checklist */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Select Facilitators</span>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  style={{ padding: '3px 8px', fontSize: 11 }}
                  onClick={() => setShowFacForm(!showFacForm)}
                >
                  {showFacForm ? 'Cancel' : '+ New Facilitator'}
                </button>
              </div>

              {showFacForm ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#f8f9fa', padding: 8, borderRadius: 6, border: '1px solid var(--border)', marginBottom: 8 }}>
                  <input type="text" placeholder="Full Name" value={facForm.name} onChange={e => setFacForm({ ...facForm, name: e.target.value })} style={{ padding: '4px 8px', fontSize: 12 }} />
                  <input type="text" placeholder="Role (e.g. Lead Facilitator)" value={facForm.role} onChange={e => setFacForm({ ...facForm, role: e.target.value })} style={{ padding: '4px 8px', fontSize: 12 }} />
                  <input type="text" placeholder="Organization" value={facForm.organization} onChange={e => setFacForm({ ...facForm, organization: e.target.value })} style={{ padding: '4px 8px', fontSize: 12 }} />
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleAddFacilitator}>Save Facilitator</button>
                </div>
              ) : null}

              <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {facilitators.length === 0 ? (
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>No facilitators registered yet.</span>
                ) : (
                  facilitators.map(fac => (
                    <label key={fac.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={facilitatorIds.includes(fac.id)}
                        onChange={() => handleToggleFacilitator(fac.id)}
                      />
                      {fac.name} <span style={{ color: 'var(--muted)', fontSize: 11 }}>({fac.role || 'Facilitator'})</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Ministry Contacts Checklist */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Select Ministry Contacts</span>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  style={{ padding: '3px 8px', fontSize: 11 }}
                  onClick={() => setShowContactForm(!showContactForm)}
                >
                  {showContactForm ? 'Cancel' : '+ New Delegate'}
                </button>
              </div>

              {showContactForm ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#f8f9fa', padding: 8, borderRadius: 6, border: '1px solid var(--border)', marginBottom: 8 }}>
                  <input type="text" placeholder="Full Name" value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} style={{ padding: '4px 8px', fontSize: 12 }} />
                  <input type="text" placeholder="Title (e.g. Provincial Officer)" value={contactForm.title} onChange={e => setContactForm({ ...contactForm, title: e.target.value })} style={{ padding: '4px 8px', fontSize: 12 }} />
                  <input type="text" placeholder="Ministry / Dept" value={contactForm.ministry} onChange={e => setContactForm({ ...contactForm, ministry: e.target.value })} style={{ padding: '4px 8px', fontSize: 12 }} />
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleAddContact}>Save Contact</button>
                </div>
              ) : null}

              <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {ministryContacts.length === 0 ? (
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>No ministry contacts saved yet.</span>
                ) : (
                  ministryContacts.map(mc => (
                    <label key={mc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={ministryContactIds.includes(mc.id)}
                        onChange={() => handleToggleContact(mc.id)}
                      />
                      {mc.name} <span style={{ color: 'var(--muted)', fontSize: 11 }}>({mc.title || 'Delegate'})</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Budget items spreadsheet-like calculator */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label style={{ fontWeight: 700, margin: 0 }}>Budget Line Items</label>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddLineItem}>
                <IconPlus /> Add Item
              </button>
            </div>

            {lineItems.length === 0 ? (
              <div style={{ border: '1px dashed var(--border)', padding: '24px 0', textAlign: 'center', color: 'var(--muted)', borderRadius: 6, fontSize: 13 }}>
                No budget line items added yet. Click "Add Item" above to construct workshop finances.
              </div>
            ) : (
              <div className="table-wrap" style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
                <table>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      <th style={{ width: 140, padding: 8 }}>Category</th>
                      <th style={{ padding: 8 }}>Description</th>
                      <th style={{ width: 80, padding: 8, textAlign: 'right' }}>Qty</th>
                      <th style={{ width: 100, padding: 8, textAlign: 'right' }}>Unit Cost</th>
                      <th style={{ width: 110, padding: 8, textAlign: 'right' }}>Total</th>
                      <th style={{ width: 44, padding: 8 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map(item => (
                      <tr key={item.id}>
                        <td style={{ padding: '6px 8px' }}>
                          <select 
                            value={item.category} 
                            onChange={e => handleUpdateLineItem(item.id, 'category', e.target.value)}
                            style={{ padding: '4px 6px', fontSize: 13 }}
                          >
                            <option value="Accommodation">Accommodation</option>
                            <option value="Catering">Catering</option>
                            <option value="Transport">Transport</option>
                            <option value="Stationery">Stationery</option>
                            <option value="Venue Hire">Venue Hire</option>
                            <option value="Stipend / Allowance">Stipend / Allowance</option>
                            <option value="Other">Other</option>
                          </select>
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input 
                            type="text" 
                            value={item.description} 
                            onChange={e => handleUpdateLineItem(item.id, 'description', e.target.value)}
                            placeholder="Details e.g. Lunch for participants"
                            style={{ padding: '4px 8px', fontSize: 13 }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input 
                            type="number" 
                            value={item.quantity} 
                            onChange={e => handleUpdateLineItem(item.id, 'quantity', e.target.value)}
                            style={{ padding: '4px 8px', fontSize: 13, textAlign: 'right' }}
                            min="1"
                          />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input 
                            type="number" 
                            value={item.unitCost} 
                            onChange={e => handleUpdateLineItem(item.id, 'unitCost', e.target.value)}
                            style={{ padding: '4px 8px', fontSize: 13, textAlign: 'right' }}
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, fontSize: 13 }}>
                          {currency} {Number(item.amount || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <button 
                            type="button" 
                            className="btn btn-danger btn-sm" 
                            style={{ padding: 4, borderRadius: 4, display: 'flex', color: 'var(--red)' }}
                            onClick={() => handleRemoveLineItem(item.id)}
                          >
                            <IconX />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, paddingRight: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>
                Total Budget: <span style={{ color: 'var(--green-dark)' }}>{currency} {totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label>Notes / Requisition Details</label>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              placeholder="e.g. Budget covering training logistics for pedagogy sessions. Accommodations arranged at local hub hotel."
              rows="3"
            />
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Save Requisition</button>
        </div>
      </div>
    </div>
  )
}
