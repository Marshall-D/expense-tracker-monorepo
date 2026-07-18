import type { Request, Response } from "express";
import { getDb } from "../lib/mongo";
import { jsonResponse, send } from "../lib/response";

export async function health(_req: Request, res: Response) {
  try {
    const db = await getDb();
    const mongo = db ? "connected" : "no-mongo";
    return send(res, jsonResponse(200, { status: "ok", mongo }));
  } catch (err) {
    console.error("health handler error", err);
    return send(res, jsonResponse(500, { status: "error" }));
  }
}
