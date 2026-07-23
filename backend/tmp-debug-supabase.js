import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: './.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function main() {
  const users = await supabase.from('users').select('*').limit(10);
  console.log('users', JSON.stringify(users, null, 2));
  const teachers = await supabase.from('teachers').select('*').limit(10);
  console.log('teachers', JSON.stringify(teachers, null, 2));
}

main().catch((err) => { console.error('ERR', err); process.exit(1); });
