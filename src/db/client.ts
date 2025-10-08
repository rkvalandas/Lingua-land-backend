import { Pool, QueryResult } from "pg";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  port: parseInt(process.env.DB_PORT || "5432"),
  ssl: process.env.NODE_ENV === "production" 
    ? { rejectUnauthorized: false } 
    : undefined,
});

export default {
  query: (text: string, params?: any[]): Promise<QueryResult> =>
    pool.query(text, params),
  getClient: () => pool.connect(),
};
