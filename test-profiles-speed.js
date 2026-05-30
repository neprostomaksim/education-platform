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

async function checkSlowQueries() {
  console.log("Checking DB responsiveness by querying profiles...");
  const start = Date.now();
  try {
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    console.log(`Profiles query took ${Date.now() - start}ms`);
    if (error) console.log("Profiles query error:", error);
  } catch (err) {
    console.log("Fatal Error:", err);
  }
  process.exit(0);
}

checkSlowQueries();
