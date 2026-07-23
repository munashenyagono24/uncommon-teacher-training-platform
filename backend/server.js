import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import crypto from 'crypto';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  createUser,
  getUserByEmail,
  getUserById,
  getTeachers,
  getTeacherById,
  upsertTeacher,
  deleteTeacher,
  getAttendanceByTeacherId,
  getWorkshops,
  getWorkshopById,
  getLastWorkshopAtLocation,
  getTeachersByWorkshopId,
  upsertWorkshop,
  deleteWorkshop,
  getAttendance,
  getAttendanceByWorkshopId,
  getAttendanceDuplicateCheck,
  insertAttendance,
  deleteAttendance,
  getLocations,
  getLocationById,
  upsertLocation,
  deleteLocation,
  getFacilitators,
  upsertFacilitator,
  deleteFacilitator,
  getMinistryContacts,
  upsertMinistryContact,
  deleteMinistryContact,
  getFundRequisitions,
  getFundRequisitionById,
  upsertFundRequisition,
  deleteFundRequisition,
  getFundLineItemsForRequisition,
  deleteFundLineItemsForRequisition,
  saveFundLineItem,
  getDashboardStats,
  getDashboardAttendanceByWorkshop,
  hasSupabase,
  isSupabaseServiceRole
} from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'anesu-uncommon-org-secret-key-2026';

async function seedAdminUser() {
  if (!hasSupabase || !isSupabaseServiceRole) return;
  const adminEmail = 'anesu@uncommon.org';
  const existing = await getUserByEmail(adminEmail);
  if (existing) return;

  const hashedPassword = await bcrypt.hash('anesu123', 10);
  await createUser({
    id: '00000000-0000-0000-0000-000000000000',
    email: adminEmail,
    password: hashedPassword,
    role: 'admin',
    teacher_id: null,
    created_at: new Date().toISOString()
  });
  console.log('✅ Seeded default admin user for Supabase auth.');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// ── JWT Custom Auth Verification Middleware ──
const requireAuth = async (req, res, next) => {
  // Bypass authentication when Supabase is not configured or in test environment
  if (!hasSupabase || process.env.NODE_ENV === 'test') {
    req.user = { id: '00000000-0000-0000-0000-000000000000', email: 'anesu@uncommon.org', role: 'admin' };
    return next();
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing Authorization token.' });
    }

    const token = authHeader.split(' ')[1];
    
    // Developer bypass for testing
    if (token === 'mock-token') {
      req.user = { id: '00000000-0000-0000-0000-000000000000', email: 'anesu@uncommon.org', role: 'admin' };
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await getUserById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      teacherId: user.teacher_id,
      teachers: user.teachers
    };
    next();
  } catch (error) {
    console.error('JWT authentication error:', error.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
  }
};

// Admin validation middleware
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden: Admin access required.' });
  }
};

// ── Mappers ──
function mapTeacher(t) {
  return {
    id: t.id,
    teacherId: t.teacher_id,
    fullName: t.full_name,
    email: t.email,
    phone: t.phone,
    bootcamp: t.bootcamp,
    region: t.region,
    qrCode: t.qr_code,
    createdAt: t.created_at,
    age: t.age ? parseInt(t.age, 10) : null,
    gender: t.gender || null
  };
}

function mapWorkshop(w) {
  return {
    id: w.id,
    name: w.name,
    date: w.date,
    location: w.location,
    facilitators: typeof w.facilitators === 'string' ? JSON.parse(w.facilitators) : w.facilitators,
    expectedParticipants: w.expected_participants,
    createdAt: w.created_at,
    startDate: w.start_date || w.date,
    endDate: w.end_date || w.date,
    locationId: w.location_id || null,
    fundRequisitionId: w.fund_requisition_id || null,
    status: w.status || 'planned',
    comments: w.comments || null,
    ministryContacts: typeof w.ministry_contacts === 'string' ? JSON.parse(w.ministry_contacts) : (w.ministry_contacts || [])
  };
}

function mapAttendance(a) {
  return {
    id: a.id,
    teacherId: a.teacher_id,
    workshopId: a.workshop_id,
    checkInTime: a.check_in_time,
    status: a.status,
    syncStatus: a.sync_status,
    attendanceDate: a.attendance_date || (a.check_in_time ? a.check_in_time.split('T')[0] : null)
  };
}

function parseJsonArray(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch (_) { return []; }
  }
  return [];
}

function sumLineItems(lineItems = []) {
  return lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function mapLocation(l) {
  return {
    id: l.id,
    name: l.name,
    region: l.region,
    address: l.address,
    createdAt: l.created_at,
  };
}

function mapFacilitator(f) {
  return {
    id: f.id,
    name: f.name,
    email: f.email,
    phone: f.phone,
    role: f.role,
    organization: f.organization,
    createdAt: f.created_at,
  };
}

function mapMinistryContact(m) {
  return {
    id: m.id,
    name: m.name,
    title: m.title,
    ministry: m.ministry,
    email: m.email,
    phone: m.phone,
    createdAt: m.created_at,
  };
}

function mapFundLineItem(item) {
  return {
    id: item.id,
    requisitionId: item.requisition_id,
    category: item.category,
    description: item.description,
    quantity: Number(item.quantity),
    unitCost: Number(item.unit_cost),
    amount: Number(item.amount),
  };
}

function mapFundRequisition(r, lineItems = []) {
  return {
    id: r.id,
    title: r.title,
    status: r.status,
    requestedBy: r.requested_by,
    locationId: r.location_id,
    startDate: r.start_date,
    endDate: r.end_date,
    currency: r.currency,
    totalAmount: Number(r.total_amount),
    notes: r.notes,
    facilitatorIds: parseJsonArray(r.facilitator_ids),
    ministryContactIds: parseJsonArray(r.ministry_contact_ids),
    lineItems: lineItems.map(mapFundLineItem),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ── AUTH ROUTES ──

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, role, profile } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email is already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    let teacherId = null;

    // If teacher profile is passed, create the teacher profile first
    if (role === 'teacher' && profile) {
      teacherId = crypto.randomUUID();
      const tempId = makeTeacherId();
      const qrCode = await QRCode.toDataURL(JSON.stringify({ id: teacherId, teacherId: tempId }), {
        width: 260,
        margin: 2,
        color: { dark: '#1a5c3a', light: '#ffffff' }
      });

      await upsertTeacher({
        id: teacherId,
        teacher_id: tempId,
        full_name: profile.fullName,
        email: email,
        phone: profile.phone,
        bootcamp: profile.bootcamp,
        region: profile.region,
        qr_code: qrCode,
        created_at: new Date().toISOString(),
        age: profile.age ? parseInt(profile.age, 10) : null,
        gender: profile.gender || null
      });
    }

    const newUser = await createUser({
      id: userId,
      email,
      password: hashedPassword,
      role: role || 'teacher',
      teacher_id: teacherId,
      created_at: new Date().toISOString()
    });

    const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        teacherId: newUser.teacher_id
      }
    });
  } catch (error) {
    console.error('Signup error:', error.message);
    res.status(500).json({ error: error.message || 'Internal server error during registration.' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        teacherId: user.teacher_id,
        teachers: user.teachers
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: error.message || 'Internal server error during login.' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

// Helper for generating teacher ID formats
function makeTeacherId() {
  const yr = String(new Date().getFullYear()).slice(-2);
  const num = String(Math.floor(Math.random() * 90000 + 10000));
  return `TCH-${yr}-${num}`;
}

// ── Teachers Routes ──

// GET /api/teachers
app.get('/api/teachers', requireAuth, async (req, res) => {
  try {
    const rows = await getTeachers();
    res.json(rows.map(mapTeacher));
  } catch (error) {
    console.error('GET /api/teachers error:', error.message);
    res.status(500).json({ error: 'Database error fetching teachers.' });
  }
});

// GET /api/teachers/:id
app.get('/api/teachers/:id', requireAuth, async (req, res) => {
  try {
    const teacher = await getTeacherById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found.' });
    }
    res.json(mapTeacher(teacher));
  } catch (error) {
    console.error('GET /api/teachers/:id error:', error.message);
    res.status(500).json({ error: 'Database error fetching teacher.' });
  }
});

// POST /api/teachers
app.post('/api/teachers', requireAuth, async (req, res) => {
  try {
    const { id, teacherId, qrCode, fullName, email, phone, bootcamp, region, createdAt, age, gender } = req.body;

    if (!fullName || !email || !phone || !bootcamp || !region) {
      return res.status(400).json({ error: 'Missing required fields: fullName, email, phone, bootcamp, region.' });
    }

    const finalId = id || crypto.randomUUID();
    const finalTeacherId = teacherId || makeTeacherId();
    const finalCreatedAt = createdAt || new Date().toISOString();

    let finalQrCode = qrCode;
    if (!finalQrCode) {
      finalQrCode = await QRCode.toDataURL(JSON.stringify({ id: finalId, teacherId: finalTeacherId }), {
        width: 260,
        margin: 2,
        color: { dark: '#1a5c3a', light: '#ffffff' }
      });
    }

    const saved = await upsertTeacher({
      id: finalId,
      teacher_id: finalTeacherId,
      full_name: fullName,
      email,
      phone,
      bootcamp,
      region,
      qr_code: finalQrCode,
      created_at: finalCreatedAt,
      age: age ? parseInt(age, 10) : null,
      gender: gender || null
    });

    res.status(201).json(mapTeacher(saved));
  } catch (error) {
    console.error('POST /api/teachers error:', error.message);
    res.status(500).json({ error: 'Database error registering teacher.' });
  }
});

// DELETE /api/teachers/:id
app.delete('/api/teachers/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await deleteTeacher(req.params.id);
    res.json({ success: true, message: 'Teacher deleted successfully.' });
  } catch (error) {
    console.error('DELETE /api/teachers/:id error:', error.message);
    res.status(500).json({ error: 'Database error deleting teacher.' });
  }
});

// GET /api/teachers/:id/attendance
app.get('/api/teachers/:id/attendance', requireAuth, async (req, res) => {
  try {
    const rows = await getAttendanceByTeacherId(req.params.id);
    res.json(rows.map(mapAttendance));
  } catch (error) {
    console.error('GET /api/teachers/:id/attendance error:', error.message);
    res.status(500).json({ error: 'Database error fetching attendance.' });
  }
});

// ── Workshops Routes ──

// GET /api/workshops
app.get('/api/workshops', requireAuth, async (req, res) => {
  try {
    const rows = await getWorkshops();
    res.json(rows.map(mapWorkshop));
  } catch (error) {
    console.error('GET /api/workshops error:', error.message);
    res.status(500).json({ error: 'Database error fetching workshops.' });
  }
});

// GET /api/workshops/last-at-location
app.get('/api/workshops/last-at-location', requireAuth, async (req, res) => {
  try {
    const { location, locationId } = req.query;
    if (!location && !locationId) {
      return res.status(400).json({ error: 'Missing parameter: location or locationId.' });
    }

    const lastWorkshop = await getLastWorkshopAtLocation(locationId, location);

    if (!lastWorkshop) {
      return res.json([]);
    }

    const teachers = await getTeachersByWorkshopId(lastWorkshop.id);
    res.json(teachers.map(mapTeacher));
  } catch (error) {
    console.error('GET /api/workshops/last-at-location error:', error.message);
    res.status(500).json({ error: 'Database error fetching cached teachers.' });
  }
});

// GET /api/workshops/:id
app.get('/api/workshops/:id', requireAuth, async (req, res) => {
  try {
    const workshop = await getWorkshopById(req.params.id);
    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found.' });
    }
    res.json(mapWorkshop(workshop));
  } catch (error) {
    console.error('GET /api/workshops/:id error:', error.message);
    res.status(500).json({ error: 'Database error fetching workshop.' });
  }
});

// POST /api/workshops
app.post('/api/workshops', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      id, name, date, location, facilitators, expectedParticipants, createdAt,
      startDate, endDate, locationId, fundRequisitionId, status, comments, ministryContacts
    } = req.body;

    if (!name || !date || !location || expectedParticipants === undefined) {
      return res.status(400).json({ error: 'Missing required fields: name, date, location, expectedParticipants.' });
    }

    const finalId = id || crypto.randomUUID();
    const finalCreatedAt = createdAt || new Date().toISOString();
    const finalFacilitators = facilitators || [];
    const finalMinistryContacts = ministryContacts || [];

    const saved = await upsertWorkshop({
      id: finalId,
      name,
      date,
      location,
      facilitators: finalFacilitators,
      expected_participants: parseInt(expectedParticipants, 10),
      created_at: finalCreatedAt,
      start_date: startDate || date,
      end_date: endDate || date,
      location_id: locationId || null,
      fund_requisition_id: fundRequisitionId || null,
      status: status || 'planned',
      comments: comments || null,
      ministry_contacts: finalMinistryContacts
    });

    res.status(201).json(mapWorkshop(saved));
  } catch (error) {
    console.error('POST /api/workshops error:', error.message);
    res.status(500).json({ error: 'Database error creating workshop.' });
  }
});

// PUT /api/workshops/:id
app.put('/api/workshops/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      name, date, location, facilitators, expectedParticipants,
      startDate, endDate, locationId, fundRequisitionId, status, comments, ministryContacts
    } = req.body;

    const current = await getWorkshopById(req.params.id);
    if (!current) {
      return res.status(404).json({ error: 'Workshop not found.' });
    }

    const finalFacilitators = facilitators || current.facilitators;
    const finalMinistryContacts = ministryContacts || current.ministry_contacts;

    const updated = await upsertWorkshop({
      ...current,
      name: name ?? current.name,
      date: date ?? current.date,
      location: location ?? current.location,
      facilitators: finalFacilitators,
      expected_participants: expectedParticipants !== undefined ? parseInt(expectedParticipants, 10) : current.expected_participants,
      start_date: startDate ?? current.start_date,
      end_date: endDate ?? current.end_date,
      location_id: locationId !== undefined ? locationId : current.location_id,
      fund_requisition_id: fundRequisitionId !== undefined ? fundRequisitionId : current.fund_requisition_id,
      status: status ?? current.status,
      comments: comments ?? current.comments,
      ministry_contacts: finalMinistryContacts
    });

    res.json(mapWorkshop(updated));
  } catch (error) {
    console.error('PUT /api/workshops/:id error:', error.message);
    res.status(500).json({ error: 'Database error updating workshop.' });
  }
});

// DELETE /api/workshops/:id
app.delete('/api/workshops/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await deleteWorkshop(req.params.id);
    res.json({ success: true, message: 'Workshop deleted successfully.' });
  } catch (error) {
    console.error('DELETE /api/workshops/:id error:', error.message);
    res.status(500).json({ error: 'Database error deleting workshop.' });
  }
});

// GET /api/workshops/:id/attendance
app.get('/api/workshops/:id/attendance', requireAuth, async (req, res) => {
  try {
    const rows = await getAttendanceByWorkshopId(req.params.id);
    res.json(rows.map(mapAttendance));
  } catch (error) {
    console.error('GET /api/workshops/:id/attendance error:', error.message);
    res.status(500).json({ error: 'Database error fetching attendance.' });
  }
});

// ── Attendance Routes ──

// GET /api/attendance
app.get('/api/attendance', requireAuth, async (req, res) => {
  try {
    const rows = await getAttendance();
    res.json(rows.map(mapAttendance));
  } catch (error) {
    console.error('GET /api/attendance error:', error.message);
    res.status(500).json({ error: 'Database error fetching attendance.' });
  }
});

// POST /api/attendance (Single check-in)
app.post('/api/attendance', requireAuth, async (req, res) => {
  try {
    const { id, teacherId, workshopId, checkInTime, status, attendanceDate } = req.body;

    if (!teacherId || !workshopId) {
      return res.status(400).json({ error: 'Missing required fields: teacherId, workshopId.' });
    }

    const finalId = id || crypto.randomUUID();
    const finalCheckInTime = checkInTime || new Date().toISOString();
    const finalStatus = status || 'present';
    const finalAttendanceDate = attendanceDate || finalCheckInTime.split('T')[0];

    // Check duplicate check-in first
    const isDuplicate = await getAttendanceDuplicateCheck(teacherId, workshopId, finalAttendanceDate);
    if (isDuplicate) {
      return res.status(409).json({ error: 'Teacher is already checked in for this workshop day.' });
    }

    const saved = await insertAttendance({
      id: finalId,
      teacher_id: teacherId,
      workshop_id: workshopId,
      check_in_time: finalCheckInTime,
      status: finalStatus,
      sync_status: 'synced',
      attendance_date: finalAttendanceDate
    });

    res.status(201).json(mapAttendance(saved));
  } catch (error) {
    console.error('POST /api/attendance error:', error.message);
    res.status(500).json({ error: 'Database error recording check-in.' });
  }
});

// POST /api/attendance/sync (Bulk upload for offline records)
app.post('/api/attendance/sync', requireAuth, async (req, res) => {
  try {
    const { records } = req.body;

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Missing or invalid list: records must be an array.' });
    }

    let syncedCount = 0;
    let skippedCount = 0;

    for (const r of records) {
      try {
        const finalId = r.id || crypto.randomUUID();
        const finalCheckInTime = r.checkInTime || new Date().toISOString();
        const finalStatus = r.status || 'present';
        const finalAttendanceDate = r.attendanceDate || finalCheckInTime.split('T')[0];

        // Unique check
        const isDuplicate = await getAttendanceDuplicateCheck(r.teacherId, r.workshopId, finalAttendanceDate);
        if (!isDuplicate) {
          await insertAttendance({
            id: finalId,
            teacher_id: r.teacherId,
            workshop_id: r.workshopId,
            check_in_time: finalCheckInTime,
            status: finalStatus,
            sync_status: 'synced',
            attendance_date: finalAttendanceDate
          });
          syncedCount++;
        } else {
          skippedCount++;
        }
      } catch (err) {
        console.warn(`Sync failed for individual record ${r.id}:`, err.message);
        skippedCount++;
      }
    }

    res.json({ synced: syncedCount, skipped: skippedCount });
  } catch (error) {
    console.error('POST /api/attendance/sync error:', error.message);
    res.status(500).json({ error: 'Database error executing synchronization.' });
  }
});

// DELETE /api/attendance/:id
app.delete('/api/attendance/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await deleteAttendance(req.params.id);
    res.json({ success: true, message: 'Attendance record deleted successfully.' });
  } catch (error) {
    console.error('DELETE /api/attendance/:id error:', error.message);
    res.status(500).json({ error: 'Database error deleting attendance record.' });
  }
});

// ── Locations Routes ──

app.get('/api/locations', requireAuth, async (req, res) => {
  try {
    const rows = await getLocations();
    res.json(rows.map(mapLocation));
  } catch (error) {
    console.error('GET /api/locations error:', error.message);
    res.status(500).json({ error: 'Database error fetching locations.' });
  }
});

app.get('/api/locations/:id', requireAuth, async (req, res) => {
  try {
    const location = await getLocationById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found.' });
    }
    res.json(mapLocation(location));
  } catch (error) {
    console.error('GET /api/locations/:id error:', error.message);
    res.status(500).json({ error: 'Database error fetching location.' });
  }
});

app.post('/api/locations', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id, name, region, address, createdAt } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Missing required field: name.' });
    }
    const finalId = id || crypto.randomUUID();
    const finalCreatedAt = createdAt || new Date().toISOString();
    const saved = await upsertLocation({
      id: finalId,
      name: name.trim(),
      region: region || null,
      address: address || null,
      created_at: finalCreatedAt
    });
    res.status(201).json(mapLocation(saved));
  } catch (error) {
    console.error('POST /api/locations error:', error.message);
    res.status(500).json({ error: 'Database error saving location.' });
  }
});

app.delete('/api/locations/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await deleteLocation(req.params.id);
    res.json({ success: true, message: 'Location deleted successfully.' });
  } catch (error) {
    console.error('DELETE /api/locations/:id error:', error.message);
    res.status(500).json({ error: 'Database error deleting location.' });
  }
});

// ── Facilitators Routes ──

app.get('/api/facilitators', requireAuth, async (req, res) => {
  try {
    const rows = await getFacilitators();
    res.json(rows.map(mapFacilitator));
  } catch (error) {
    console.error('GET /api/facilitators error:', error.message);
    res.status(500).json({ error: 'Database error fetching facilitators.' });
  }
});

app.post('/api/facilitators', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id, name, email, phone, role, organization, createdAt } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Missing required field: name.' });
    }
    const finalId = id || crypto.randomUUID();
    const finalCreatedAt = createdAt || new Date().toISOString();
    const saved = await upsertFacilitator({
      id: finalId,
      name: name.trim(),
      email: email || null,
      phone: phone || null,
      role: role || null,
      organization: organization || null,
      created_at: finalCreatedAt
    });
    res.status(201).json(mapFacilitator(saved));
  } catch (error) {
    console.error('POST /api/facilitators error:', error.message);
    res.status(500).json({ error: 'Database error saving facilitator.' });
  }
});

app.delete('/api/facilitators/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await deleteFacilitator(req.params.id);
    res.json({ success: true, message: 'Facilitator deleted successfully.' });
  } catch (error) {
    console.error('DELETE /api/facilitators/:id error:', error.message);
    res.status(500).json({ error: 'Database error deleting facilitator.' });
  }
});

// ── Ministry Contacts Routes ──

app.get('/api/ministry-contacts', requireAuth, async (req, res) => {
  try {
    const rows = await getMinistryContacts();
    res.json(rows.map(mapMinistryContact));
  } catch (error) {
    console.error('GET /api/ministry-contacts error:', error.message);
    res.status(500).json({ error: 'Database error fetching ministry contacts.' });
  }
});

app.post('/api/ministry-contacts', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id, name, title, ministry, email, phone, createdAt } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Missing required field: name.' });
    }
    const finalId = id || crypto.randomUUID();
    const finalCreatedAt = createdAt || new Date().toISOString();
    const saved = await upsertMinistryContact({
      id: finalId,
      name: name.trim(),
      title: title || null,
      ministry: ministry || null,
      email: email || null,
      phone: phone || null,
      created_at: finalCreatedAt
    });
    res.status(201).json(mapMinistryContact(saved));
  } catch (error) {
    console.error('POST /api/ministry-contacts error:', error.message);
    res.status(500).json({ error: 'Database error saving ministry contact.' });
  }
});

app.delete('/api/ministry-contacts/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await deleteMinistryContact(req.params.id);
    res.json({ success: true, message: 'Ministry contact deleted successfully.' });
  } catch (error) {
    console.error('DELETE /api/ministry-contacts/:id error:', error.message);
    res.status(500).json({ error: 'Database error deleting ministry contact.' });
  }
});

// ── Fund Requisitions Routes ──

app.get('/api/fund-requisitions', requireAuth, async (req, res) => {
  try {
    const rows = await getFundRequisitions();
    const compiled = await Promise.all(rows.map(async (row) => {
      const lineItems = await getFundLineItemsForRequisition(row.id);
      return mapFundRequisition(row, lineItems);
    }));
    res.json(compiled);
  } catch (error) {
    console.error('GET /api/fund-requisitions error:', error.message);
    res.status(500).json({ error: 'Database error fetching fund requisitions.' });
  }
});

app.get('/api/fund-requisitions/:id', requireAuth, async (req, res) => {
  try {
    const row = await getFundRequisitionById(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Fund requisition not found.' });
    }
    const lineItems = await getFundLineItemsForRequisition(req.params.id);
    res.json(mapFundRequisition(row, lineItems));
  } catch (error) {
    console.error('GET /api/fund-requisitions/:id error:', error.message);
    res.status(500).json({ error: 'Database error fetching fund requisition.' });
  }
});

app.post('/api/fund-requisitions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      id, title, status, requestedBy, locationId, startDate, endDate,
      currency, notes, facilitatorIds, ministryContactIds, lineItems, createdAt, updatedAt,
    } = req.body;

    if (!title?.trim() || !requestedBy?.trim()) {
      return res.status(400).json({ error: 'Missing required fields: title, requestedBy.' });
    }

    const finalId = id || crypto.randomUUID();
    const now = new Date().toISOString();
    const finalCreatedAt = createdAt || now;
    const finalUpdatedAt = updatedAt || now;
    const finalStatus = status || 'draft';
    const finalCurrency = currency || 'USD';
    const finalTotal = sumLineItems(lineItems || []);

    const saved = await upsertFundRequisition({
      id: finalId,
      title: title.trim(),
      status: finalStatus,
      requested_by: requestedBy.trim(),
      location_id: locationId || null,
      start_date: startDate || null,
      end_date: endDate || null,
      currency: finalCurrency,
      total_amount: finalTotal,
      notes: notes || null,
      facilitator_ids: facilitatorIds || [],
      ministry_contact_ids: ministryContactIds || [],
      created_at: finalCreatedAt,
      updated_at: finalUpdatedAt
    });

    await deleteFundLineItemsForRequisition(finalId);
    if (lineItems && lineItems.length > 0) {
      for (const item of lineItems) {
        const qty = Number(item.quantity ?? 1);
        const uCost = Number(item.unitCost ?? 0);
        await saveFundLineItem({
          id: item.id || crypto.randomUUID(),
          requisition_id: finalId,
          category: item.category,
          description: item.description,
          quantity: qty,
          unit_cost: uCost,
          amount: item.amount ?? (qty * uCost)
        });
      }
    }

    const savedItems = await getFundLineItemsForRequisition(finalId);
    res.status(201).json(mapFundRequisition(saved, savedItems));
  } catch (error) {
    console.error('POST /api/fund-requisitions error:', error.message);
    res.status(500).json({ error: 'Database error saving fund requisition.' });
  }
});

app.put('/api/fund-requisitions/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const current = await getFundRequisitionById(req.params.id);
    if (!current) {
      return res.status(404).json({ error: 'Fund requisition not found.' });
    }

    const {
      title, status, requestedBy, locationId, startDate, endDate,
      currency, notes, facilitatorIds, ministryContactIds, lineItems,
    } = req.body;

    const finalTotal = lineItems ? sumLineItems(lineItems) : Number(current.total_amount);
    const finalUpdatedAt = new Date().toISOString();

    const updated = await upsertFundRequisition({
      ...current,
      title: (title ?? current.title).trim(),
      status: status ?? current.status,
      requested_by: (requestedBy ?? current.requested_by).trim(),
      location_id: locationId !== undefined ? locationId : current.location_id,
      start_date: startDate !== undefined ? startDate : current.start_date,
      end_date: endDate !== undefined ? endDate : current.end_date,
      currency: currency ?? current.currency,
      total_amount: finalTotal,
      notes: notes !== undefined ? notes : current.notes,
      facilitator_ids: facilitatorIds ?? parseJsonArray(current.facilitator_ids),
      ministry_contact_ids: ministryContactIds ?? parseJsonArray(current.ministry_contact_ids),
      updated_at: finalUpdatedAt
    });

    if (lineItems) {
      await deleteFundLineItemsForRequisition(req.params.id);
      for (const item of lineItems) {
        const qty = Number(item.quantity ?? 1);
        const uCost = Number(item.unitCost ?? 0);
        await saveFundLineItem({
          id: item.id || crypto.randomUUID(),
          requisition_id: req.params.id,
          category: item.category,
          description: item.description,
          quantity: qty,
          unit_cost: uCost,
          amount: item.amount ?? (qty * uCost)
        });
      }
    }

    const savedItems = await getFundLineItemsForRequisition(req.params.id);
    res.json(mapFundRequisition(updated, savedItems));
  } catch (error) {
    console.error('PUT /api/fund-requisitions/:id error:', error.message);
    res.status(500).json({ error: 'Database error updating fund requisition.' });
  }
});

app.delete('/api/fund-requisitions/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await deleteFundRequisition(req.params.id);
    res.json({ success: true, message: 'Fund requisition deleted successfully.' });
  } catch (error) {
    console.error('DELETE /api/fund-requisitions/:id error:', error.message);
    res.status(500).json({ error: 'Database error deleting fund requisition.' });
  }
});

// ── Dashboard Statistics Routes ──

// GET /api/dashboard
app.get('/api/dashboard', requireAuth, async (req, res) => {
  try {
    const stats = await getDashboardStats();
    const avgPerWorkshop = stats.workshops > 0 ? Math.round(stats.attendance / stats.workshops) : 0;

    res.json({
      totalTeachers: stats.teachers,
      totalWorkshops: stats.workshops,
      totalCheckins: stats.attendance,
      avgPerWorkshop
    });
  } catch (error) {
    console.error('GET /api/dashboard error:', error.message);
    res.status(500).json({ error: 'Database error loading dashboard stats.' });
  }
});

// GET /api/dashboard/attendance-by-workshop
app.get('/api/dashboard/attendance-by-workshop', requireAuth, async (req, res) => {
  try {
    const data = await getDashboardAttendanceByWorkshop();
    res.json(data);
  } catch (error) {
    console.error('GET /api/dashboard/attendance-by-workshop error:', error.message);
    res.status(500).json({ error: 'Database error loading workshop charts.' });
  }
});

// Start Server
app.listen(PORT, async () => {
  if (hasSupabase) {
    try {
      await seedAdminUser();
    } catch (error) {
      console.error('Admin seeding failed:', error.message);
    }
  }
  console.log(`\n🚀 Teacher Training backend running on port ${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}`);
});
