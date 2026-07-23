import http from 'http';

const data = JSON.stringify({
  email: 'test.teacher@uncommon.org',
  password: 'TestPass123!',
  role: 'teacher',
  profile: {
    fullName: 'Test Teacher',
    phone: '+263771234567',
    bootcamp: 'Bootcamp 3',
    region: 'Harare',
    age: 25,
    gender: 'female'
  }
});

const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/auth/signup',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};

const req = http.request(options, (res) => {
  console.log('status', res.statusCode);
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('body', body));
});

req.on('error', (err) => {
  console.error('err', err.message);
});

req.write(data);
req.end();
