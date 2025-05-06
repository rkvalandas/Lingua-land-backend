import { Pool, QueryResult } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "language_learning",
  user: process.env.DB_USER || "rkvalandasu",
  password: process.env.DB_PASSWORD || "rkvalandasu",
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

export default {
  query: (text: string, params?: any[]): Promise<QueryResult> => pool.query(text, params),
  getClient: () => pool.connect(),
};