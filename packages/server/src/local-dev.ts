// packages/server/src/local-dev.ts
import "dotenv/config";
import type { APIGatewayProxyResult } from "aws-lambda";
import { handler } from "./handlers/health";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();
app.use(bodyParser.json());
app.use(cors()); // <--- allow CORS for all origins in local dev

app.get("/api/health", async (_req, res) => {
  try {
    // call lambda handler (local shim)
    const result = (await handler(
      {} as any,
      {} as any,
      () => null
    )) as APIGatewayProxyResult | void;

    if (!result) {
      return res.status(500).json({ error: "Handler returned no response" });
    }

    const { statusCode = 200, headers = {}, body = "" } = result;
    // add CORS headers if not present
    res.set({ "Access-Control-Allow-Origin": "*", ...headers } as any);
    return res.status(statusCode).send(body);
  } catch (err) {
    console.error("local-dev handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () =>
  console.log("Local server running on http://localhost:" + port)
);
