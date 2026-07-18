import "dotenv/config";

import { createApp } from "./app";
import { assertEnv } from "./lib/env";
import { getDb } from "./lib/mongo";

assertEnv("MONGO_URI", "Set MONGO_URI in packages/server/.env");
assertEnv("JWT_SECRET", "Set JWT_SECRET in packages/server/.env");

const app = createApp();
const port = Number(process.env.PORT || 3000);

const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    try {
      const g = global as { __mongoClient?: { close: () => Promise<void> } };
      if (g.__mongoClient) {
        await g.__mongoClient.close();
      }
    } catch (err) {
      console.error("Error closing MongoDB client:", err);
    }
    process.exit(0);
  });
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

// Warm the DB connection in the background (non-blocking).
void getDb().catch((err) => {
  console.error("Initial MongoDB connection failed:", err);
});
