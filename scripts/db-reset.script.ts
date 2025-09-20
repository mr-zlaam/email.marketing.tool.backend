import envConfig from "../src/config/env.config";
import { database } from "../src/db/db";
async function resetDatabase() {
  try {
    if (envConfig.NODE_ENV === "development") {
      await database.db.execute(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
    `);
      console.log("✅ Database schema reset successfully.");
    } else {
      throw new Error("Database can't be reset in prodcution environment");
    }
    process.exit(0);
  } catch (err) {
    const error = err as Error;
    console.error("❌ Failed to reset DB:", error.message);
    console.error(`${err as string}`);
    process.exit(1);
  }
}

resetDatabase();
