import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log("Missing URL or KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log("Searching every table for any reference to Cida's ID (4506cd4a-ce16-4784-b3f7-f857232014c2)...");
  const cidaId = '4506cd4a-ce16-4784-b3f7-f857232014c2';

  const tables = ['patients', 'households', 'visits', 'system_logs', 'campaigns'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error(`Error reading ${table}:`, error.message);
      continue;
    }
    
    // Check for cidaId as values anywhere in data JSON string
    const stringified = JSON.stringify(data || []);
    if (stringified.includes(cidaId)) {
      console.log(`[FOUND IN ${table}] Cida's ID is referred in this table's records!`);
      const matches = data.filter(r => JSON.stringify(r).includes(cidaId));
      console.log("Records matching:", matches);
    } else {
      console.log(`[Clean] No references to Cida's ID in ${table}.`);
    }

    // Also let's check for the substring "cida" ignoring case in text (in case there's manual references)
    if (stringified.toLowerCase().includes('cida') && !stringified.toLowerCase().includes('cidadã')) {
      console.log(`[FOUND TEXT LIKE CIDA IN ${table}]`);
      const matchesText = data.filter(r => {
        const s = JSON.stringify(r).toLowerCase();
        return s.includes('cida') && !s.includes('cidadã') && !s.includes('acid') && !s.includes('vencida');
      });
      console.log("Records matching text:", matchesText);
    }
  }
}

run();
