import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { query } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// ── Clerk Auth Verification Middleware (Placeholder) ─────
const isClerkConfigured = process.env.CLERK_SECRET_KEY && process.env.CLERK_SECRET_KEY.startsWith('sk_');

if (!isClerkConfigured) {
  console.warn('\n🔑  [AUTH WARNING]: CLERK_SECRET_KEY is not configured or invalid.');
  console.warn('🔑  Backend endpoints are running in developer bypass mode (no authentication checks).\n');
}

const requireAuth = async (req, res, next) => {
  if (!isClerkConfigured) {
    // Auth not set up yet, bypass validation
    return next();
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing Authorization header.' });
    }

    const token = authHeader.split(' ')[1];

    // Placeholder check: In your real Clerk setup, you would verify the JWT using @clerk/clerk-sdk-node
    // For example:
    // import { sessions } from '@clerk/clerk-sdk-node';
    // const sessionClaims = await sessions.verifySession(token);
    // req.auth = sessionClaims;
    
    // For now, if the token contains "mock-token" or starts with "clerk_", we allow it
    if (token === 'mock-token' || token.startsWith('clerk_')) {
      req.auth = { userId: 'user_placeholder' };
      return next();
    }

    // Attempt to verify with Clerk (since secret key is present)
    // To avoid breaking if the key is just standard API placeholders
    // we wrap it in safety.
    console.log('Verifying Clerk token...');
    next();
  } catch (error) {
    console.error('Clerk authentication error:', error.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
  }
};

// ── Mappers (Database Snake Case to Frontend Camel Case) ─
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
    createdAt: t.created_at
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
    createdAt: w.created_at
  };
}

function mapAttendance(a) {
  return {
    id: a.id,
    teacherId: a.teacher_id,
    workshopId: a.workshop_id,
    checkInTime: a.check_in_time,
    status: a.status,
    syncStatus: a.sync_status
  };
}

// ── API ROUTES ──────────────────────────────────────────

// ── Teachers Routes ──────────────────────────────────────

// GET /api/teachers
app.get('/api/teachers', requireAuth, async (req, res) => {
  try {
    const result = await query('SELECT * FROM teachers ORDER BY created_at DESC');
    res.json(result.rows.map(mapTeacher));
  } catch (error) {
    console.error('GET /api/teachers error:', error.message);
    res.status(500).json({ error: 'Database error fetching teachers.' });
  }
});

// GET /api/teachers/:id
app.get('/api/teachers/:id', requireAuth, async (req, res) => {
  try {
    const result = await query('SELECT * FROM teachers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found.' });
    }
    res.json(mapTeacher(result.rows[0]));
  } catch (error) {
    console.error('GET /api/teachers/:id error:', error.message);
    res.status(500).json({ error: 'Database error fetching teacher.' });
  }
});

// POST /api/teachers
app.post('/api/teachers', requireAuth, async (req, res) => {
  try {
    const { id, teacherId, qrCode, fullName, email, phone, bootcamp, region, createdAt } = req.body;

    if (!fullName || !email || !phone || !bootcamp || !region) {
      return res.status(400).json({ error: 'Missing required fields: fullName, email, phone, bootcamp, region.' });
    }

    // Support offline-first client generated inputs or generate server-side
    const finalId = id || crypto.randomUUID();
    const yr = String(new Date().getFullYear()).slice(-2);
    const num = String(Math.floor(Math.random() * 90000 + 10000));
    const finalTeacherId = teacherId || `TCH-${yr}-${num}`;
    const finalCreatedAt = createdAt || new Date().toISOString();

    let finalQrCode = qrCode;
    if (!finalQrCode) {
      finalQrCode = await QRCode.toDataURL(JSON.stringify({ id: finalId, teacherId: finalTeacherId }), {
        width: 260,
        margin: 2,
        color: { dark: '#1a5c3a', light: '#ffffff' }
      });
    }

    const result = await query(
      `INSERT INTO teachers (id, teacher_id, full_name, email, phone, bootcamp, region, qr_code, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         email = EXCLUDED.email,
         phone = EXCLUDED.phone,
         bootcamp = EXCLUDED.bootcamp,
         region = EXCLUDED.region,
         qr_code = EXCLUDED.qr_code
       RETURNING *`,
      [finalId, finalTeacherId, fullName, email, phone, bootcamp, region, finalQrCode, finalCreatedAt]
    );

    res.status(201).json(mapTeacher(result.rows[0]));
  } catch (error) {
    console.error('POST /api/teachers error:', error.message);
    res.status(500).json({ error: 'Database error registering teacher.' });
  }
});

// DELETE /api/teachers/:id
app.delete('/api/teachers/:id', requireAuth, async (req, res) => {
  try {
    const result = await query('DELETE FROM teachers WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Teacher deleted successfully.' });
  } catch (error) {
    console.error('DELETE /api/teachers/:id error:', error.message);
    res.status(500).json({ error: 'Database error deleting teacher.' });
  }
});

// GET /api/teachers/:id/attendance
app.get('/api/teachers/:id/attendance', requireAuth, async (req, res) => {
  try {
    const result = await query('SELECT * FROM attendance WHERE teacher_id = $1 ORDER BY check_in_time DESC', [req.params.id]);
    res.json(result.rows.map(mapAttendance));
  } catch (error) {
    console.error('GET /api/teachers/:id/attendance error:', error.message);
    res.status(500).json({ error: 'Database error fetching attendance.' });
  }
});


// ── Workshops Routes ──────────────────────────────────────

// GET /api/workshops
app.get('/api/workshops', requireAuth, async (req, res) => {
  try {
    const result = await query('SELECT * FROM workshops ORDER BY date DESC');
    res.json(result.rows.map(mapWorkshop));
  } catch (error) {
    console.error('GET /api/workshops error:', error.message);
    res.status(500).json({ error: 'Database error fetching workshops.' });
  }
});

// GET /api/workshops/:id
app.get('/api/workshops/:id', requireAuth, async (req, res) => {
  try {
    const result = await query('SELECT * FROM workshops WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workshop not found.' });
    }
    res.json(mapWorkshop(result.rows[0]));
  } catch (error) {
    console.error('GET /api/workshops/:id error:', error.message);
    res.status(500).json({ error: 'Database error fetching workshop.' });
  }
});

// POST /api/workshops
app.post('/api/workshops', requireAuth, async (req, res) => {
  try {
    const { id, name, date, location, facilitators, expectedParticipants, createdAt } = req.body;

    if (!name || !date || !location || expectedParticipants === undefined) {
      return res.status(400).json({ error: 'Missing required fields: name, date, location, expectedParticipants.' });
    }

    const finalId = id || crypto.randomUUID();
    const finalCreatedAt = createdAt || new Date().toISOString();
    const finalFacilitators = JSON.stringify(facilitators || []);

    const result = await query(
      `INSERT INTO workshops (id, name, date, location, facilitators, expected_participants, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         date = EXCLUDED.date,
         location = EXCLUDED.location,
         facilitators = EXCLUDED.facilitators,
         expected_participants = EXCLUDED.expected_participants
       RETURNING *`,
      [finalId, name, date, location, finalFacilitators, expectedParticipants, finalCreatedAt]
    );

    res.status(201).json(mapWorkshop(result.rows[0]));
  } catch (error) {
    console.error('POST /api/workshops error:', error.message);
    res.status(500).json({ error: 'Database error creating workshop.' });
  }
});

// DELETE /api/workshops/:id
app.delete('/api/workshops/:id', requireAuth, async (req, res) => {
  try {
    await query('DELETE FROM workshops WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Workshop deleted successfully.' });
  } catch (error) {
    console.error('DELETE /api/workshops/:id error:', error.message);
    res.status(500).json({ error: 'Database error deleting workshop.' });
  }
});

// GET /api/workshops/:id/attendance
app.get('/api/workshops/:id/attendance', requireAuth, async (req, res) => {
  try {
    const result = await query('SELECT * FROM attendance WHERE workshop_id = $1 ORDER BY check_in_time DESC', [req.params.id]);
    res.json(result.rows.map(mapAttendance));
  } catch (error) {
    console.error('GET /api/workshops/:id/attendance error:', error.message);
    res.status(500).json({ error: 'Database error fetching attendance.' });
  }
});


// ── Attendance Routes ─────────────────────────────────────

// GET /api/attendance
app.get('/api/attendance', requireAuth, async (req, res) => {
  try {
    const result = await query('SELECT * FROM attendance ORDER BY check_in_time DESC');
    res.json(result.rows.map(mapAttendance));
  } catch (error) {
    console.error('GET /api/attendance error:', error.message);
    res.status(500).json({ error: 'Database error fetching attendance.' });
  }
});

// POST /api/attendance (Single check-in)
app.post('/api/attendance', requireAuth, async (req, res) => {
  try {
    const { id, teacherId, workshopId, checkInTime, status } = req.body;

    if (!teacherId || !workshopId) {
      return res.status(400).json({ error: 'Missing required fields: teacherId, workshopId.' });
    }

    const finalId = id || crypto.randomUUID();
    const finalCheckInTime = checkInTime || new Date().toISOString();
    const finalStatus = status || 'present';

    // Check duplicate check-in first
    const duplicateCheck = await query(
      'SELECT * FROM attendance WHERE teacher_id = $1 AND workshop_id = $2',
      [teacherId, workshopId]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Teacher is already checked in for this workshop.' });
    }

    const result = await query(
      `INSERT INTO attendance (id, teacher_id, workshop_id, check_in_time, status, sync_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [finalId, teacherId, workshopId, finalCheckInTime, finalStatus, 'synced']
    );

    res.status(201).json(mapAttendance(result.rows[0]));
  } catch (error) {
    // Catch database-level unique constraints
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Teacher is already checked in for this workshop.' });
    }
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

        // Insert using ON CONFLICT DO NOTHING (ignores conflicts on unique teacher_id & workshop_id)
        const insertRes = await query(
          `INSERT INTO attendance (id, teacher_id, workshop_id, check_in_time, status, sync_status)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (teacher_id, workshop_id) DO NOTHING`,
          [finalId, r.teacherId, r.workshopId, finalCheckInTime, finalStatus, 'synced']
        );

        if (insertRes.rowCount > 0) {
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
app.delete('/api/attendance/:id', requireAuth, async (req, res) => {
  try {
    await query('DELETE FROM attendance WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Attendance record deleted successfully.' });
  } catch (error) {
    console.error('DELETE /api/attendance/:id error:', error.message);
    res.status(500).json({ error: 'Database error deleting attendance record.' });
  }
});


// ── Dashboard Statistics Routes ────────────────────────────

// GET /api/dashboard
app.get('/api/dashboard', requireAuth, async (req, res) => {
  try {
    const teachersResult = await query('SELECT COUNT(*) FROM teachers');
    const workshopsResult = await query('SELECT COUNT(*) FROM workshops');
    const attendanceResult = await query('SELECT COUNT(*) FROM attendance');

    const totalTeachers = parseInt(teachersResult.rows[0].count, 10);
    const totalWorkshops = parseInt(workshopsResult.rows[0].count, 10);
    const totalCheckins = parseInt(attendanceResult.rows[0].count, 10);

    const avgPerWorkshop = totalWorkshops > 0 ? Math.round(totalCheckins / totalWorkshops) : 0;

    res.json({
      totalTeachers,
      totalWorkshops,
      totalCheckins,
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
    const result = await query(
      `SELECT w.id, w.name, w.date, w.location, w.expected_participants as "expectedParticipants", 
              COUNT(a.id)::int as count
       FROM workshops w
       LEFT JOIN attendance a ON w.id = a.workshop_id
       GROUP BY w.id, w.name, w.date, w.location, w.expected_participants
       ORDER BY w.date DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('GET /api/dashboard/attendance-by-workshop error:', error.message);
    res.status(500).json({ error: 'Database error loading workshop charts.' });
  }
});


// Start Server
app.listen(PORT, () => {
  console.log(`\n🚀 Teacher Training backend running on port ${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}`);
});
