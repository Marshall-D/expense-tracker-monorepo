// packages/server/src/lib/mongo.ts
import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGO_URI || "";
if (process.env.NODE_ENV === "production" && !uri) {
  throw new Error("MONGO_URI is required in production");
}

/**
 * Declare module-level globals that survive across Lambda warm invocations.
 * Give them explicit types so TypeScript doesn't treat them as `any`.
 */
declare global {
  // these are created on purpose and may be undefined initially
  // Using `| undefined` avoids implicit any errors.
  // Do not export; this is a module augmentation of the global scope.
  var __mongoClient: MongoClient | undefined;
  var __mongoDb: Db | undefined;
}

// Ensure this file is a module and not a script
export async function getDb(): Promise<Db | null> {
  if (!uri) return null;

  const g = global as typeof globalThis & {
    __mongoClient?: MongoClient;
    __mongoDb?: Db;
  };

  if (g.__mongoDb) return g.__mongoDb;

  if (!g.__mongoClient) {
    g.__mongoClient = new MongoClient(uri, { maxPoolSize: 10 });
    await g.__mongoClient.connect();
  }

  g.__mongoDb = g.__mongoClient.db();
  return g.__mongoDb;
}
