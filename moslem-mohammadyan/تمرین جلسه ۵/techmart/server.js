import "dotenv/config";
import app from "./src/app.js";
import { config } from "./src/config/env.js";
import { initializeDatabase } from "./src/data/store.js";

try {
  await initializeDatabase();
  app.listen(config.port, () => {
    console.log(`TechMart is running at http://localhost:${config.port}`);
    console.log("Demo admin: admin@techmart.local / Admin123!");
  });
} catch (error) {
  console.error("Could not start TechMart:", error);
  process.exit(1);
}
