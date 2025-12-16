// Simple end-to-end journal test: login -> create journal -> fetch journal
// Usage (PowerShell): node tests/journal.e2e.js

const BASE = process.env.BASE_URL || 'http://localhost:5000';
const USERNAME = process.env.TEST_USERNAME || 'Rs';
const PASSWORD = process.env.TEST_PASSWORD || '1234567';
const COUPLE_ID = parseInt(process.env.COUPLE_ID || '28', 10); // Use partner_id (28 for user Rs)
const DATE = process.env.JOURNAL_DATE || '2025-10-02';

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD })
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`Login parse error: ${text}`); }
  if (!res.ok) throw new Error(`Login failed ${res.status}: ${text}`);
  if (!json.token) throw new Error(`No token in login response: ${text}`);
  return json.token;
}

async function postJournal(token) {
  const timestamp = new Date().toLocaleString();
  const body = {
    data: {
      content: `New journal entry created at ${timestamp}`,
      isPrivate: false,
      theme: 'test-theme',
      location: 'Test Location',
      weather: 'Sunny'
    }
  };
  console.log('\nCreating journal with body:', JSON.stringify(body, null, 2));
  const res = await fetch(`${BASE}/api/journal/${COUPLE_ID}/date/${DATE}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch {}
  console.log('\n✅ POST status:', res.status);
  if (res.status === 200 || res.status === 201) {
    console.log('✅ Journal created successfully!');
    console.log('Journal data:', JSON.stringify(json, null, 2));
  } else {
    console.log('❌ Failed to create journal');
    console.log('Response:', json || text);
  }
  return { status: res.status, body: json || text };
}

async function getJournal(token) {
  const res = await fetch(`${BASE}/api/journal/${COUPLE_ID}/date/${DATE}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch {}
  console.log('\n📖 GET status:', res.status);
  if (res.status === 200) {
    console.log('✅ Journal retrieved successfully!');
    console.log('Total entries:', json?.data?.length || 0);
    if (json?.data && json.data.length > 0) {
      const latest = json.data[json.data.length - 1];
      console.log('Latest entry:', {
        content: latest.content?.substring(0, 50) + '...',
        theme: latest.theme,
        created_at: latest.created_at
      });
    }
  } else {
    console.log('❌ Failed to retrieve journal');
    console.log('Response:', json || text);
  }
  return { status: res.status, body: json || text };
}

(async () => {
  try {
    console.log('Logging in as', USERNAME);
    const token = await login();
    console.log('Token acquired');
    const post = await postJournal(token);
    const get = await getJournal(token);
    if (post.status === 400 && post.body && post.body.details) {
      console.log('Validation errors:', post.body.details);
    }
  } catch (err) {
    console.error('E2E test error:', err.message);
    process.exit(1);
  }
})();


