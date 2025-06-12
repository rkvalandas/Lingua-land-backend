import pool from './client';
import fs from 'fs';
import path from 'path';

async function setupDatabase() {
  try {
    console.log('🚀 Setting up database...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📋 Executing database schema...');
    await pool.query(schema);
    
    console.log('✅ Database schema executed successfully');
    
    // Check if tables were created
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 Tables created:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Test the users table
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`👥 Users in database: ${userCount.rows[0].count}`);
    
    console.log('🎉 Database setup complete!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('Database setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database setup failed:', error);
      process.exit(1);
    });
}

export default setupDatabase;
