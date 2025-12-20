// packages/server/src/handlers/health.ts

import { APIGatewayProxyHandler } from "aws-lambda";
import { getDb } from "../lib/mongo";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // quick allow for preflight if needed
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: CORS_HEADERS,
        body: "",
      };
    }

    const db = await getDb();
    const mongo = db ? "connected" : "no-mongo";

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ status: "ok", mongo }),
    };
  } catch (err) {
    console.error("health handler error", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ status: "error" }),
    };
  }
};
