import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

export const isTestMode = process.env.NODE_ENV === 'test';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
export const isSupabaseServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasSupabase = !isTestMode && !!(supabaseUrl && supabaseKey);

export let supabase = null;
if (hasSupabase) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('🔌  [DATABASE]: Connected to Supabase!');
  if (isSupabaseServiceRole) {
    console.log('🔐  [DATABASE]: Using SUPABASE_SERVICE_ROLE_KEY for backend operations.');
  } else {
    console.warn('⚠️  [DATABASE]: Using SUPABASE_ANON_KEY only. If your tables use row-level security, backend writes may fail.');
  }
} else {
  if (isTestMode) {
    console.warn('\n⚠️  [DATABASE WARNING]: Test mode enabled. Using temporary in-memory database for backend tests.');
  } else {
    console.warn('\n⚠️  [DATABASE WARNING]: Supabase env variables not set or invalid. The backend is running in temporary IN-MEMORY mode.');
    console.warn('⚠️  Data will NOT persist when the server restarts. Set SUPABASE_URL and SUPABASE_ANON_KEY to enable persistence.\n');
  }
}

// ── In-Memory Database Fallback ──
const memDb = {
  users: [],
  teachers: [],
  workshops: [],
  attendance: [],
  locations: [],
  facilitators: [],
  ministry_contacts: [],
  fund_requisitions: [],
  fund_line_items: [],
};

// Seeding local admin for testing/fallback
memDb.users.push({
  id: '00000000-0000-0000-0000-000000000000',
  email: 'anesu@uncommon.org',
  password: '$2b$10$6ou99UNXoIQWDRa36qP1eOfnQCUOUOh8QuaTcjTjF/fTY.djtE/9u', // bcrypt hash for 'anesu123'
  role: 'admin',
  teacher_id: null,
  created_at: new Date().toISOString()
});

function upsertById(list, row) {
  const idx = list.findIndex(item => item.id === row.id);
  if (idx >= 0) list[idx] = row;
  else list.push(row);
  return row;
}

// Backward compatibility or legacy query support if needed
export function query(text, params) {
  console.warn('Direct SQL query called, unsupported in Supabase mode:', text);
  return Promise.resolve({ rows: [] });
}

// ── Database Helper Functions ──

// Auth / Users
export async function createUser(user) {
  if (hasSupabase) {
    const { data, error } = await supabase.from('users').insert(user).select().single();
    if (error) {
      if (error.code === '42501' || /row-level security/i.test(error.message)) {
        throw new Error('Supabase permission denied: row-level security is blocking writes. Set SUPABASE_SERVICE_ROLE_KEY or update table policies.');
      }
      throw error;
    }
    return data;
  } else {
    memDb.users.push(user);
    return user;
  }
}

export async function getUserByEmail(email) {
  if (hasSupabase) {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    if (!user) return null;

    let teacher = null;
    if (user.teacher_id) {
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('*')
        .eq('id', user.teacher_id)
        .maybeSingle();
      if (teacherError) throw teacherError;
      teacher = teacherData || null;
    }

    return { ...user, teachers: teacher };
  } else {
    const user = memDb.users.find(u => u.email === email);
    if (!user) return null;
    const teacher = memDb.teachers.find(t => t.id === user.teacher_id);
    return { ...user, teachers: teacher || null };
  }
}

export async function getUserById(id) {
  if (hasSupabase) {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!user) return null;

    let teacher = null;
    if (user.teacher_id) {
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('*')
        .eq('id', user.teacher_id)
        .maybeSingle();
      if (teacherError) throw teacherError;
      teacher = teacherData || null;
    }

    return { ...user, teachers: teacher };
  } else {
    const user = memDb.users.find(u => u.id === id);
    if (!user) return null;
    const teacher = memDb.teachers.find(t => t.id === user.teacher_id);
    return { ...user, teachers: teacher || null };
  }
}

// Teachers
export async function getTeachers() {
  if (hasSupabase) {
    const { data, error } = await supabase.from('teachers').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } else {
    return [...memDb.teachers].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

export async function getTeacherById(id) {
  if (hasSupabase) {
    const { data, error } = await supabase.from('teachers').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  } else {
    return memDb.teachers.find(t => t.id === id) || null;
  }
}

export async function upsertTeacher(teacher) {
  if (hasSupabase) {
    const { data, error } = await supabase.from('teachers').upsert(teacher).select().single();
    if (error) {
      if (error.code === '42501' || /row-level security/i.test(error.message)) {
        throw new Error('Supabase permission denied: row-level security is blocking teacher writes. Set SUPABASE_SERVICE_ROLE_KEY or update table policies.');
      }
      throw error;
    }
    return data;
  } else {
    upsertById(memDb.teachers, teacher);
    return teacher;
  }
}

export async function deleteTeacher(id) {
  if (hasSupabase) {
    const { error } = await supabase.from('teachers').delete().eq('id', id);
    if (error) throw error;
  } else {
    memDb.teachers = memDb.teachers.filter(t => t.id !== id);
    memDb.attendance = memDb.attendance.filter(a => a.teacher_id !== id);
  }
}

export async function getAttendanceByTeacherId(teacherId) {
  if (hasSupabase) {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('check_in_time', { ascending: false });
    if (error) throw error;
    return data || [];
  } else {
    return memDb.attendance
      .filter(a => a.teacher_id === teacherId)
      .sort((a, b) => b.check_in_time.localeCompare(a.check_in_time));
  }
}

// Workshops
export async function getWorkshops() {
  if (hasSupabase) {
    const { data, error } = await supabase.from('workshops').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  } else {
    return [...memDb.workshops].sort((a, b) => b.date.localeCompare(a.date));
  }
}

export async function getWorkshopById(id) {
  if (hasSupabase) {
    const { data, error } = await supabase.from('workshops').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  } else {
    return memDb.workshops.find(w => w.id === id) || null;
  }
}

export async function getLastWorkshopAtLocation(locationId, locationName) {
  if (hasSupabase) {
    let query = supabase.from('workshops').select('*');
    if (locationId) {
      query = query.eq('location_id', locationId);
    } else {
      query = query.eq('location', locationName);
    }
    const { data, error } = await query.order('date', { ascending: false }).limit(1);
    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } else {
    let list = memDb.workshops;
    if (locationId) {
      list = list.filter(w => w.location_id === locationId);
    } else {
      list = list.filter(w => w.location === locationName);
    }
    const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
    return sorted.length > 0 ? sorted[0] : null;
  }
}

export async function getTeachersByWorkshopId(workshopId) {
  if (hasSupabase) {
    const { data: att, error: attErr } = await supabase.from('attendance').select('teacher_id').eq('workshop_id', workshopId);
    if (attErr) throw attErr;
    if (!att || att.length === 0) return [];
    const ids = att.map(a => a.teacher_id);
    const { data: teachers, error: tErr } = await supabase.from('teachers').select('*').in('id', ids);
    if (tErr) throw tErr;
    return teachers || [];
  } else {
    const teacherIds = memDb.attendance.filter(a => a.workshop_id === workshopId).map(a => a.teacher_id);
    return memDb.teachers.filter(t => teacherIds.includes(t.id));
  }
}

export async function upsertWorkshop(workshop) {
  if (hasSupabase) {
    const { data, error } = await supabase.from('workshops').upsert(workshop).select().single();
    if (error) throw error;
    return data;
  } else {
    upsertById(memDb.workshops, workshop);
    return workshop;
  }
}

export async function deleteWorkshop(id) {
  if (hasSupabase) {
    const { error } = await supabase.from('workshops').delete().eq('id', id);
    if (error) throw error;
  } else {
    memDb.workshops = memDb.workshops.filter(w => w.id !== id);
    memDb.attendance = memDb.attendance.filter(a => a.workshop_id !== id);
  }
}

// Attendance
export async function getAttendance() {
  if (hasSupabase) {
    const { data, error } = await supabase.from('attendance').select('*').order('check_in_time', { ascending: false });
    if (error) throw error;
    return data || [];
  } else {
    return [...memDb.attendance].sort((a, b) => b.check_in_time.localeCompare(a.check_in_time));
  }
}

export async function getAttendanceByWorkshopId(workshopId) {
  if (hasSupabase) {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('workshop_id', workshopId)
      .order('check_in_time', { ascending: false });
    if (error) throw error;
    return data || [];
  } else {
    return memDb.attendance
      .filter(a => a.workshop_id === workshopId)
      .sort((a, b) => b.check_in_time.localeCompare(a.check_in_time));
  }
}

export async function getAttendanceDuplicateCheck(teacherId, workshopId, date) {
  if (hasSupabase) {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('workshop_id', workshopId)
      .eq('attendance_date', date);
    if (error) throw error;
    return data && data.length > 0;
  } else {
    return memDb.attendance.some(a => a.teacher_id === teacherId && a.workshop_id === workshopId && a.attendance_date === date);
  }
}

export async function insertAttendance(record) {
  if (hasSupabase) {
    const { data, error } = await supabase.from('attendance').insert(record).select().single();
    if (error) throw error;
    return data;
  } else {
    memDb.attendance.push(record);
    return record;
  }
}

export async function deleteAttendance(id) {
  if (hasSupabase) {
    const { error } = await supabase.from('attendance').delete().eq('id', id);
    if (error) throw error;
  } else {
    memDb.attendance = memDb.attendance.filter(a => a.id !== id);
  }
}

// Locations
export async function getLocations() {
  if (hasSupabase) {
    const { data, error } = await supabase.from('locations').select('*').order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  } else {
    return [...memDb.locations].sort((a, b) => a.name.localeCompare(b.name));
  }
}

export async function getLocationById(id) {
  if (hasSupabase) {
    const { data, error } = await supabase.from('locations').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  } else {
    return memDb.locations.find(l => l.id === id) || null;
  }
}

export async function upsertLocation(location) {
  if (hasSupabase) {
    const { data, error } = await supabase.from('locations').upsert(location).select().single();
    if (error) throw error;
    return data;
  } else {
    upsertById(memDb.locations, location);
    return location;
  }
}

export async function deleteLocation(id) {
  if (hasSupabase) {
    const { error } = await supabase.from('locations').delete().eq('id', id);
    if (error) throw error;
  } else {
    memDb.locations = memDb.locations.filter(l => l.id !== id);
  }
}

// Facilitators
export async function getFacilitators() {
  if (hasSupabase) {
    const { data, error } = await supabase.from('facilitators').select('*').order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  } else {
    return [...memDb.facilitators].sort((a, b) => a.name.localeCompare(b.name));
  }
}

export async function upsertFacilitator(facilitator) {
  if (hasSupabase) {
    const { data, error } = await supabase.from('facilitators').upsert(facilitator).select().single();
    if (error) throw error;
    return data;
  } else {
    upsertById(memDb.facilitators, facilitator);
    return facilitator;
  }
}

export async function deleteFacilitator(id) {
  if (hasSupabase) {
    const { error } = await supabase.from('facilitators').delete().eq('id', id);
    if (error) throw error;
  } else {
    memDb.facilitators = memDb.facilitators.filter(f => f.id !== id);
  }
}

// Ministry Contacts
export async function getMinistryContacts() {
  if (hasSupabase) {
    const { data, error } = await supabase.from('ministry_contacts').select('*').order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  } else {
    return [...memDb.ministry_contacts].sort((a, b) => a.name.localeCompare(b.name));
  }
}

export async function upsertMinistryContact(contact) {
  if (hasSupabase) {
    const { data, error } = await supabase.from('ministry_contacts').upsert(contact).select().single();
    if (error) throw error;
    return data;
  } else {
    upsertById(memDb.ministry_contacts, contact);
    return contact;
  }
}

export async function deleteMinistryContact(id) {
  if (hasSupabase) {
    const { error } = await supabase.from('ministry_contacts').delete().eq('id', id);
    if (error) throw error;
  } else {
    memDb.ministry_contacts = memDb.ministry_contacts.filter(m => m.id !== id);
  }
}

// Fund Requisitions
export async function getFundRequisitions() {
  if (hasSupabase) {
    const { data, error } = await supabase.from('fund_requisitions').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } else {
    return [...memDb.fund_requisitions].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

export async function getFundRequisitionById(id) {
  if (hasSupabase) {
    const { data, error } = await supabase.from('fund_requisitions').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  } else {
    return memDb.fund_requisitions.find(r => r.id === id) || null;
  }
}

export async function upsertFundRequisition(requisition) {
  if (hasSupabase) {
    const { data, error } = await supabase.from('fund_requisitions').upsert(requisition).select().single();
    if (error) throw error;
    return data;
  } else {
    upsertById(memDb.fund_requisitions, requisition);
    return requisition;
  }
}

export async function deleteFundRequisition(id) {
  if (hasSupabase) {
    const { error } = await supabase.from('fund_requisitions').delete().eq('id', id);
    if (error) throw error;
  } else {
    memDb.fund_requisitions = memDb.fund_requisitions.filter(r => r.id !== id);
    memDb.fund_line_items = memDb.fund_line_items.filter(i => i.requisition_id !== id);
  }
}

// Fund Line Items
export async function getFundLineItemsForRequisition(requisitionId) {
  if (hasSupabase) {
    const { data, error } = await supabase
      .from('fund_line_items')
      .select('*')
      .eq('requisition_id', requisitionId)
      .order('category')
      .order('description');
    if (error) throw error;
    return data || [];
  } else {
    return memDb.fund_line_items.filter(i => i.requisition_id === requisitionId);
  }
}

export async function deleteFundLineItemsForRequisition(requisitionId) {
  if (hasSupabase) {
    const { error } = await supabase.from('fund_line_items').delete().eq('requisition_id', requisitionId);
    if (error) throw error;
  } else {
    memDb.fund_line_items = memDb.fund_line_items.filter(i => i.requisition_id !== requisitionId);
  }
}

export async function saveFundLineItem(item) {
  if (hasSupabase) {
    const { error } = await supabase.from('fund_line_items').insert(item);
    if (error) throw error;
  } else {
    memDb.fund_line_items.push(item);
  }
}

// Dashboard statistics
export async function getDashboardStats() {
  if (hasSupabase) {
    const { count: teachers } = await supabase.from('teachers').select('*', { count: 'exact', head: true });
    const { count: workshops } = await supabase.from('workshops').select('*', { count: 'exact', head: true });
    const { count: attendance } = await supabase.from('attendance').select('*', { count: 'exact', head: true });
    return {
      teachers: teachers || 0,
      workshops: workshops || 0,
      attendance: attendance || 0
    };
  } else {
    return {
      teachers: memDb.teachers.length,
      workshops: memDb.workshops.length,
      attendance: memDb.attendance.length
    };
  }
}

export async function getDashboardAttendanceByWorkshop() {
  if (hasSupabase) {
    const { data, error } = await supabase
      .from('workshops')
      .select('id, name, date, location, expected_participants, attendance(id)')
      .order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(w => ({
      id: w.id,
      name: w.name,
      date: w.date,
      location: w.location,
      expectedParticipants: w.expected_participants,
      count: w.attendance ? w.attendance.length : 0
    }));
  } else {
    return memDb.workshops.map(w => {
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
  }
}
