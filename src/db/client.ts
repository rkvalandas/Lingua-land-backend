import { Pool, QueryResult } from "pg";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
  ssl: {
    rejectUnauthorized: false, // Required for Supabase
  },
});

export default {
  query: (text: string, params?: any[]): Promise<QueryResult> =>
    pool.query(text, params),
  getClient: () => pool.connect(),
};
