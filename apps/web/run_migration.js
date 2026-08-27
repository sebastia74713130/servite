// Apply migration using direct PostgreSQL connection via pg npm package
const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres.whcgetmvlhysrhkyxupz:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoY2dldG12bGh5c3Joa3l4dXB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjg0ODc0MiwiZXhwIjoyMDk4NDI0NzQyfQ.LsJEywgdNtin4Ax2mNY1_K12xgoXK2jZutnp3a6MQVk@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

async function applyMigration() {
  try {
    await client.connect();
    console.log('Connected to database!');
    
    const queries = [
      "ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT",
      "ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_nit TEXT", 
      "ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS food_court_session_id TEXT",
      "CREATE INDEX IF NOT EXISTS orders_food_court_session_idx ON public.orders(food_court_session_id)"
    ];
    
    for (const q of queries) {
      try {
        await client.query(q);
        console.log('OK:', q.substring(0, 70));
      } catch(e) {
        console.log('Note:', e.message);
      }
    }
    
    // Verify
    const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND column_name IN ('customer_name','customer_nit','food_court_session_id')");
    console.log('Columns found:', res.rows.map(r => r.column_name));
    
  } catch(e) {
    console.error('Connection error:', e.message);
  } finally {
    await client.end();
  }
}

applyMigration();
