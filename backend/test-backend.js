import { spawn } from 'child_process';
import http from 'http';

// We run the server on a test port (5001) in in-memory mode
const TEST_PORT = 5001;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

console.log('Starting backend test server...');
const serverProcess = spawn('node', ['server.js'], {
  shell: true,
  env: {
    ...process.env,
    PORT: TEST_PORT,
    DATABASE_URL: '', // force in-memory mode
    CLERK_SECRET_KEY: '', // bypass auth checks for testing
  }
});

// Capture output
serverProcess.stdout.on('data', (data) => {
  console.log(`[SERVER stdout]: ${data.toString().trim()}`);
});

serverProcess.stderr.on('data', (data) => {
  console.error(`[SERVER stderr]: ${data.toString().trim()}`);
});

serverProcess.on('error', (err) => {
  console.error('[SERVER process error]:', err);
});

serverProcess.on('exit', (code, signal) => {
  console.log(`[SERVER process exit] code: ${code}, signal: ${signal}`);
});

// Wait for server to boot, then run tests
setTimeout(runTests, 2000);

async function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const payload = body ? JSON.stringify(body) : null;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: data ? JSON.parse(data) : null
          });
        } catch (_) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    console.log('\n--- Running Integration Tests ---\n');

    // 1. Create a Teacher
    const teacherData = {
      id: '9f8e7d6c-5b4a-3f2e-1d0c-9b8a7f6e5d4c',
      teacherId: 'TCH-26-11111',
      fullName: 'John Doe',
      email: 'john@uncommon.org',
      phone: '+263771112222',
      bootcamp: 'Mbare Hub',
      region: 'Harare'
    };
    const tCreate = await request('POST', '/teachers', teacherData);
    assert(tCreate.status === 201, 'POST /teachers should return 201');
    assert(tCreate.body.fullName === 'John Doe', 'Response body should match created teacher');
    assert(tCreate.body.qrCode !== undefined, 'Teacher response should contain QR code');

    // 2. Fetch all teachers
    const tGet = await request('GET', '/teachers');
    assert(tGet.status === 200, 'GET /teachers should return 200');
    assert(Array.isArray(tGet.body), 'GET /teachers should return an array');
    assert(tGet.body.length === 1, 'Array size should be 1');

    // 3. Create a Workshop
    const workshopData = {
      id: '2a3b4c5d-6e7f-8a9b-0c1d-2e3f4a5b6c7d',
      name: 'Web Dev Essentials',
      date: '2026-07-06',
      location: 'Uncommon Office',
      facilitators: ['Alice', 'Bob'],
      expectedParticipants: 25
    };
    const wCreate = await request('POST', '/workshops', workshopData);
    assert(wCreate.status === 201, 'POST /workshops should return 201');
    assert(wCreate.body.name === 'Web Dev Essentials', 'Response body should match created workshop');
    assert(wCreate.body.facilitators.length === 2, 'Should serialize/deserialize facilitators array');

    // 4. Create an Attendance record
    const attendanceData = {
      id: '5e4d3c2b-1a0f-9e8d-7c6b-5a4d3c2b1a0f',
      teacherId: teacherData.id,
      workshopId: workshopData.id,
      checkInTime: new Date().toISOString(),
      status: 'present'
    };
    const aCreate = await request('POST', '/attendance', attendanceData);
    assert(aCreate.status === 201, 'POST /attendance should return 201');
    assert(aCreate.body.status === 'present', 'Attendance status should be present');

    // 5. Try creating a duplicate attendance record (Expect 409)
    const aDuplicate = await request('POST', '/attendance', attendanceData);
    assert(aDuplicate.status === 409, 'POST duplicate /attendance should return 409 Conflict');

    // 6. Test Bulk Sync Attendance
    const syncData = {
      records: [
        {
          id: '8f7e6d5c-4b3a-2f1e-0d9c-8b7a6f5e4d3c',
          teacherId: teacherData.id,
          workshopId: workshopData.id, // duplicate -> should be skipped
          checkInTime: new Date().toISOString(),
          status: 'present'
        },
        {
          id: '2f3e4d5c-6b7a-8f9e-0d1c-2b3a4f5e6d7c',
          teacherId: teacherData.id,
          workshopId: 'another-workshop-id-placeholder', // new -> should sync (foreign key constraints check skipped in-memory)
          checkInTime: new Date().toISOString(),
          status: 'present'
        }
      ]
    };
    const aSync = await request('POST', '/attendance/sync', syncData);
    assert(aSync.status === 200, 'POST /attendance/sync should return 200');
    assert(aSync.body.synced === 1, 'Should record exactly 1 newly synced record');
    assert(aSync.body.skipped === 1, 'Should skip exactly 1 duplicate record');

    // 7. Load Dashboard stats
    const dash = await request('GET', '/dashboard');
    assert(dash.status === 200, 'GET /dashboard should return 200');
    assert(dash.body.totalTeachers === 1, 'Should count 1 teacher');
    assert(dash.body.totalWorkshops === 1, 'Should count 1 workshop');
    assert(dash.body.totalCheckins === 2, 'Should count 2 total checkins');

    // 8. Delete operations
    const tDelete = await request('DELETE', `/teachers/${teacherData.id}`);
    assert(tDelete.status === 200, 'DELETE /teachers/:id should return 200');

    const dashPostDelete = await request('GET', '/dashboard');
    assert(dashPostDelete.body.totalTeachers === 0, 'Teachers count should drop to 0 after deletion');
    assert(dashPostDelete.body.totalCheckins === 0, 'Attendance count should cascade delete to 0');

  } catch (error) {
    console.error('Test run error:', error);
    failed++;
  } finally {
    console.log(`\n--- Test Results: ${passed} passed, ${failed} failed ---\n`);
    
    // Shut down server
    console.log('Stopping server...');
    serverProcess.kill();
    process.exit(failed > 0 ? 1 : 0);
  }
}
