import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const hasDbUrl = !!process.env.DATABASE_URL;

// Connection Pool (only if URL is configured)
let pool = null;
if (hasDbUrl) {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL.includes('neon.tech');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err.message);
  });
} else {
  console.warn('\n⚠️  [DATABASE WARNING]: DATABASE_URL is not set. The backend is running in temporary IN-MEMORY mode.');
  console.warn('⚠️  Data will NOT persist when the server restarts. To enable persistence, set up Neon PostgreSQL.\n');
}

// ── In-Memory Database Fallback for local testing ───────
const memDb = {
  teachers: [],
  workshops: [],
  attendance: []
};

// Helper function to simulate SQL queries
function mockQuery(text, params = []) {
  const queryNormalized = text.trim().replace(/\s+/g, ' ').toLowerCase();

  // --- COUNT(*) QUERIES FOR DASHBOARD ---
  if (queryNormalized.includes('select count(*)')) {
    if (queryNormalized.includes('from teachers')) {
      return { rows: [{ count: memDb.teachers.length }] };
    }
    if (queryNormalized.includes('from workshops')) {
      return { rows: [{ count: memDb.workshops.length }] };
    }
    if (queryNormalized.includes('from attendance')) {
      return { rows: [{ count: memDb.attendance.length }] };
    }
  }

  // --- LEFT JOIN WORKSHOP CHART STATS ---
  if (queryNormalized.includes('select w.id, w.name') || queryNormalized.includes('left join attendance')) {
    const rows = memDb.workshops.map(w => {
      const count = memDb.attendance.filter(a => a.workshop_id === w.id).length;
      return {
        id: w.id,
        name: w.name,
        date: w.date,
        location: w.location,
        expectedParticipants: w.expected_participants,
        count: count
      };
    }).sort((a, b) => b.date.localeCompare(a.date));
    return { rows };
  }

  // --- TEACHERS ---
  if (queryNormalized.includes('select * from teachers')) {
    if (queryNormalized.includes('where id = $1')) {
      const match = memDb.teachers.find(t => t.id === params[0]);
      return { rows: match ? [match] : [] };
    }
    return { rows: [...memDb.teachers] };
  }

  if (queryNormalized.includes('insert into teachers')) {
    // Columns: id, teacher_id, full_name, email, phone, bootcamp, region, qr_code, created_at
    const row = {
      id: params[0],
      teacher_id: params[1],
      full_name: params[2],
      email: params[3],
      phone: params[4],
      bootcamp: params[5],
      region: params[6],
      qr_code: params[7],
      created_at: params[8]
    };
    memDb.teachers.push(row);
    return { rows: [row], rowCount: 1 };
  }

  if (queryNormalized.includes('delete from teachers where id = $1')) {
    const id = params[0];
    const initialLength = memDb.teachers.length;
    memDb.teachers = memDb.teachers.filter(t => t.id !== id);
    memDb.attendance = memDb.attendance.filter(a => a.teacher_id !== id); // cascade delete
    return { rowCount: initialLength - memDb.teachers.length };
  }

  // --- WORKSHOPS ---
  if (queryNormalized.includes('select * from workshops')) {
    if (queryNormalized.includes('where id = $1')) {
      const match = memDb.workshops.find(w => w.id === params[0]);
      return { rows: match ? [match] : [] };
    }
    return { rows: [...memDb.workshops] };
  }

  if (queryNormalized.includes('insert into workshops')) {
    // Columns: id, name, date, location, facilitators, expected_participants, created_at
    let facilitators = params[4];
    if (typeof facilitators === 'string') {
      try { facilitators = JSON.parse(facilitators); } catch (_) {}
    }
    const row = {
      id: params[0],
      name: params[1],
      date: params[2],
      location: params[3],
      facilitators: facilitators || [],
      expected_participants: parseInt(params[5], 10),
      created_at: params[6]
    };
    memDb.workshops.push(row);
    return { rows: [row], rowCount: 1 };
  }

  if (queryNormalized.includes('delete from workshops where id = $1')) {
    const id = params[0];
    const initialLength = memDb.workshops.length;
    memDb.workshops = memDb.workshops.filter(w => w.id !== id);
    memDb.attendance = memDb.attendance.filter(a => a.workshop_id !== id); // cascade delete
    return { rowCount: initialLength - memDb.workshops.length };
  }

  // --- ATTENDANCE ---
  if (queryNormalized.includes('select * from attendance')) {
    if (queryNormalized.includes('where teacher_id = $1 and workshop_id = $2')) {
      const match = memDb.attendance.find(a => a.teacher_id === params[0] && a.workshop_id === params[1]);
      return { rows: match ? [match] : [] };
    }
    return { rows: [...memDb.attendance] };
  }

  if (queryNormalized.includes('insert into attendance')) {
    const exists = memDb.attendance.some(a => a.teacher_id === params[1] && a.workshop_id === params[2]);
    if (exists) {
      const err = new Error('duplicate key value violates unique constraint');
      err.code = '23505';
      throw err;
    }
    const row = {
      id: params[0],
      teacher_id: params[1],
      workshop_id: params[2],
      check_in_time: params[3],
      status: params[4],
      sync_status: params[5]
    };
    memDb.attendance.push(row);
    return { rows: [row], rowCount: 1 };
  }

  if (queryNormalized.includes('delete from attendance where id = $1')) {
    const id = params[0];
    const initialLength = memDb.attendance.length;
    memDb.attendance = memDb.attendance.filter(a => a.id !== id);
    return { rowCount: initialLength - memDb.attendance.length };
  }

  throw new Error(`Unsupported mock query: "${text}"`);
}

// ── Exported query interface ────────────────────────────
export function query(text, params) {
  if (hasDbUrl) {
    return pool.query(text, params);
  } else {
    // Run simulated mock database logic
    return Promise.resolve(mockQuery(text, params));
  }
}

export { pool };
