import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

dotenv.config({ path: './.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function main() {
  console.log('Using SUPABASE_URL', process.env.SUPABASE_URL);
  console.log('Checking users table...');
  const { data, error } = await supabase.from('users').select('*').limit(5);
  console.log('users data count:', data?.length, 'error:', error);

  const userEmail = 'anesu@uncommon.org';
  const { data: existing, error: existingError } = await supabase
    .from('users')
    .select('*')
    .eq('email', userEmail)
    .maybeSingle();
  console.log('existing admin row:', existing, 'error:', existingError);

  if (!existing) {
    const hashed = await bcrypt.hash('anesu123', 10);
    const { data: inserted, error: insertError } = await supabase.from('users').insert([{
      id: '00000000-0000-0000-0000-000000000000',
      email: userEmail,
      password: hashed,
      role: 'admin',
      teacher_id: null,
      created_at: new Date().toISOString()
    }]).select().single();
    console.log('inserted:', inserted, 'error:', insertError);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
