import { readFileSync } from "fs";
import { join } from "path";
import db from "./client";

async function initializeDatabase() {
  try {
    console.log("Initializing database...");

    const schemaPath = join(__dirname, "schema.sql");
    const schemaSQL = readFileSync(schemaPath, "utf8");

    // Execute the entire schema as one transaction
    await db.query(schemaSQL);

    console.log("✅ Database initialized successfully");

    // Verify tables were created
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log("\n📊 Created tables:");
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log("\n✅ Database setup complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Database setup failed:", error);
      process.exit(1);
    });
}

export { initializeDatabase };