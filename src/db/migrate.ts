import { readFileSync } from "fs";
import { join } from "path";
import db from "./client";

async function runMigration(migrationName: string) {
  try {
    console.log(`Running migration: ${migrationName}`);

    const migrationPath = join(__dirname, "migrations", `${migrationName}.sql`);
    const migrationSQL = readFileSync(migrationPath, "utf8");

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    for (const statement of statements) {
      await db.query(statement);
    }

    console.log(`Migration ${migrationName} completed successfully`);
  } catch (error) {
    console.error(`Migration ${migrationName} failed:`, error);
    throw error;
  }
}

async function main() {
  try {
    // Run migrations in order
    await runMigration("001_update_conversations_schema");

    console.log("All migrations completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { runMigration };
