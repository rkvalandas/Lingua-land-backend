import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Export the pool as default
export default pool;

// Optional: Keep the test function for debugging
export async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    console.log('Current time:', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Only run test if this file is executed directly
if (require.main === module) {
  testConnection().then((success) => {
    if (success) {
      console.log('Database test completed successfully');
    } else {
      console.log('Database test failed');
      process.exit(1);
    }
    process.exit(0);
  });
}