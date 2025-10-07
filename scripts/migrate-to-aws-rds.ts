import pkg from 'pg';
const { Pool } = pkg;
import * as fs from 'fs';
import * as path from 'path';

// Source database (Neon)
const sourcePool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Target database (AWS RDS)
const targetPool = new Pool({
  connectionString: `postgresql://${process.env.AWS_RDS_USER}:${process.env.AWS_RDS_PASSWORD}@${process.env.AWS_RDS_HOST}:${process.env.AWS_RDS_PORT}/${process.env.AWS_RDS_DATABASE}`,
  ssl: { rejectUnauthorized: false }
});

async function exportData() {
  console.log('📤 Exporting data from current database...');
  
  const tables = [
    'users',
    'care_analyses', 
    'saved_care_plans',
    'client_documents',
    'client_folder_aliases',
    'sessions'
  ];
  
  const exportData: any = {};
  
  for (const table of tables) {
    try {
      const result = await sourcePool.query(`SELECT * FROM ${table}`);
      exportData[table] = result.rows;
      console.log(`  ✓ Exported ${result.rows.length} rows from ${table}`);
    } catch (error: any) {
      console.log(`  ⚠ Table ${table} does not exist or error: ${error.message}`);
      exportData[table] = [];
    }
  }
  
  // Save backup to file
  const backupPath = path.join(process.cwd(), 'backup-data.json');
  fs.writeFileSync(backupPath, JSON.stringify(exportData, null, 2));
  console.log(`\n💾 Backup saved to: ${backupPath}\n`);
  
  return exportData;
}

async function createSchema() {
  console.log('🔨 Creating schema in Australian AWS RDS...\n');
  
  // Create tables in order (respecting foreign keys)
  const schema = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR UNIQUE,
      first_name VARCHAR,
      last_name VARCHAR,
      profile_image_url VARCHAR,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Sessions table
    CREATE TABLE IF NOT EXISTS sessions (
      sid VARCHAR PRIMARY KEY,
      sess JSONB NOT NULL,
      expire TIMESTAMP NOT NULL
    );
    CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);

    -- Care analyses table
    CREATE TABLE IF NOT EXISTS care_analyses (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      client_name TEXT NOT NULL,
      transcript TEXT NOT NULL,
      extracted_facts JSONB,
      generated_html TEXT,
      processing_mode TEXT NOT NULL DEFAULT 'ai',
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Saved care plans table
    CREATE TABLE IF NOT EXISTS saved_care_plans (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      client_name TEXT NOT NULL,
      html TEXT NOT NULL,
      extracted_facts JSONB,
      save_date TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Client documents table
    CREATE TABLE IF NOT EXISTS client_documents (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      client_name TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER,
      object_path TEXT NOT NULL,
      uploaded_at TIMESTAMP DEFAULT NOW(),
      description TEXT
    );

    -- Client folder aliases table
    CREATE TABLE IF NOT EXISTS client_folder_aliases (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      original_client_name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;
  
  await targetPool.query(schema);
  console.log('  ✓ Schema created successfully\n');
}

async function importData(data: any) {
  console.log('📥 Importing data to Australian AWS RDS...\n');
  
  const tables = [
    'users',
    'sessions',
    'care_analyses',
    'saved_care_plans',
    'client_documents',
    'client_folder_aliases'
  ];
  
  for (const table of tables) {
    const rows = data[table] || [];
    
    if (rows.length === 0) {
      console.log(`  ⏭  Skipping ${table} (no data)`);
      continue;
    }
    
    for (const row of rows) {
      const columns = Object.keys(row);
      const values = Object.values(row);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      
      const query = `
        INSERT INTO ${table} (${columns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (id) DO NOTHING
      `;
      
      try {
        await targetPool.query(query, values);
      } catch (error: any) {
        console.error(`  ✗ Error inserting into ${table}:`, error.message);
      }
    }
    
    console.log(`  ✓ Imported ${rows.length} rows to ${table}`);
  }
  
  console.log('\n✅ Migration complete!\n');
}

async function verifyMigration() {
  console.log('🔍 Verifying migration...\n');
  
  const tables = [
    'saved_care_plans',
    'users',
    'client_documents',
    'client_folder_aliases'
  ];
  
  for (const table of tables) {
    try {
      const result = await targetPool.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`  ✓ ${table}: ${result.rows[0].count} rows`);
    } catch (error: any) {
      console.log(`  ✗ ${table}: ${error.message}`);
    }
  }
  
  console.log('');
}

async function main() {
  try {
    console.log('\n🚀 Starting migration to Australian AWS RDS\n');
    console.log('Source: Neon Database');
    console.log(`Target: ${process.env.AWS_RDS_HOST}\n`);
    console.log('='.repeat(60) + '\n');
    
    // Step 1: Export data
    const data = await exportData();
    
    // Step 2: Create schema in AWS RDS
    await createSchema();
    
    // Step 3: Import data
    await importData(data);
    
    // Step 4: Verify
    await verifyMigration();
    
    console.log('='.repeat(60));
    console.log('\n🎉 Migration successful!');
    console.log('\nNext step: Update DATABASE_URL to point to AWS RDS\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

main();
