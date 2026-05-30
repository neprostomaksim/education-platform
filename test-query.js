const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key) acc[key.trim()] = val.join('=').trim().replace(/"/g, '');
  return acc;
}, {});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testQuery() {
  console.log("Fetching courses with anon key...");
  const { data, error } = await supabase.from('courses').select('*');
  console.log("Courses:", data, "Error:", error);
  process.exit(0);
}

testQuery();
