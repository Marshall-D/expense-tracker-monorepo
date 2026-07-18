import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler";
import { apiRouter } from "./routes";

/**
 * Build the Express application (no listen).
 * Used by the HTTP server and by integration tests.
 */
export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(express.json({ limit: "1mb" }));

  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "*")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin:
        allowedOrigins.length === 1 && allowedOrigins[0] === "*"
          ? true
          : allowedOrigins,
      allowedHeaders: ["Content-Type", "Authorization"],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      exposedHeaders: ["Content-Disposition"],
    }),
  );

  app.use("/api", apiRouter);
  app.use(errorHandler);

  return app;
}
