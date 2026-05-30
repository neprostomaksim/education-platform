const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key) acc[key.trim()] = val.join('=').trim().replace(/"/g, '').replace(/\r/g, '');
  return acc;
}, {});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testConnection() {
  console.log("Testing Supabase connection...");
  const start = Date.now();
  try {
    const { data, error } = await supabase.from('courses').select('id').limit(1);
    console.log(`Connection test completed in ${Date.now() - start}ms`);
    if (error) console.error("Query Error:", error);
    else console.log("Success! Data:", data);
  } catch (err) {
    console.error("Fatal Error:", err);
  }
  process.exit(0);
}

testConnection();
