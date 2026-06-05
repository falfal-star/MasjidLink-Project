const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './apps/web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  console.log("Supabase URL:", supabaseUrl);
  
  // Ambil data users
  const { data: users, error } = await supabase
    .from('users')
    .select('id, full_name, is_verified_donor');
    
  if (error) {
    console.error("Error fetching users:", error);
  } else {
    console.log("Users in DB:", users);
  }
}

checkUsers();
