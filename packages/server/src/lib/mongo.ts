// packages/server/src/lib/mongo.ts
const uri = process.env.MONGO_URI ?? "";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var __mongoClient: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var __mongoDb: any;
}

/**
 * Lazily import mongodb client to avoid import-time failures in Lambda init.
 * Returns null when no MONGO_URI is provided.
 */
export async function getDb(): Promise<any | null> {
  if (!uri) return null;

  const g = global as any;
  if (g.__mongoDb) return g.__mongoDb;

  if (!g.__mongoClient) {
    // dynamic import ensures Lambda init won't fail if module resolution is odd
    const { MongoClient } = await import("mongodb");
    g.__mongoClient = new MongoClient(uri, { maxPoolSize: 10 });
    await g.__mongoClient.connect();
  }
  g.__mongoDb = g.__mongoClient.db();
  return g.__mongoDb;
}
