#!/usr/bin/env bash
set -e
echo "Scaffolding expense-tracker-monorepo..."

# workspace
cat > pnpm-workspace.yaml <<'YAML'
packages:
  - 'packages/*'
YAML

# root package.json
cat > package.json <<'JSON'
{
  "name": "expense-tracker-monorepo",
  "private": true,
  "devDependencies": {
    "concurrently": "^8.0.0"
  },
  "scripts": {
    "build": "pnpm -w -r run build",
    "dev": "concurrently \"pnpm --filter server start:offline\" \"pnpm --filter client dev\"",
    "typecheck": "pnpm -w -r run typecheck",
    "lint": "pnpm -w -r run lint",
    "deploy:server": "pnpm --filter server run deploy",
    "deploy:client:s3": "pnpm --filter client run deploy:s3"
  }
}
JSON

# tsconfig base
cat > tsconfig.base.json <<'JSON'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": false,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
JSON

mkdir -p packages/server/src/handlers packages/server/src/lib packages/client/src packages/shared/src

# server package.json
cat > packages/server/package.json <<'JSON'
{
  "name": "server",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/local-dev.ts",
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc --noEmit",
    "deploy": "pnpm exec serverless deploy",
    "start:offline": "pnpm exec serverless offline --httpPort 3000"
  },
  "dependencies": {
    "aws-lambda": "^1.0.7",
    "dotenv": "^16.0.0",
    "mongodb": "^5.9.0"
  },
  "devDependencies": {
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.6.3",
    "serverless": "^3.40.0",
    "serverless-esbuild": "^1.20.0",
    "serverless-offline": "^12.0.0",
    "@types/node": "^22.7.9"
  }
}
JSON

# server tsconfig
cat > packages/server/tsconfig.json <<'JSON'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "module": "CommonJS",
    "lib": ["ES2022"]
  },
  "include": ["src"]
}
JSON

# server .env.example
cat > packages/server/.env.example <<'ENV'
# Optional for the smoke test (no DB required). Use your Mongo Atlas string to test DB.
MONGO_URI=
ENV

# serverless.yml for backend (root-level serverless picks project root by default)
cat > serverless.yml <<'YAML'
service: expense-tracker-api
frameworkVersion: '3'

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  environment:
    MONGO_URI: ${env:MONGO_URI}

plugins:
  - serverless-esbuild
  - serverless-offline

functions:
  health:
    handler: packages/server/src/handlers/health.handler
    events:
      - httpApi:
          path: /api/health
          method: get

custom:
  esbuild:
    bundle: true
    minify: false
    sourcemap: true
    target: node20
    platform: node
YAML

# server: cached Mongo connect (using mongodb native driver)
cat > packages/server/src/lib/mongo.ts <<'TS'
import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGO_URI || '';
if (process.env.NODE_ENV === 'production' && !uri) {
  throw new Error('MONGO_URI is required in production');
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var __mongoClient?: MongoClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var __mongoDb?: Db;
}

export async function getDb(): Promise<Db | null> {
  if (!uri) return null;
  const g = global as any;
  if (g.__mongoDb) return g.__mongoDb as Db;
  if (!g.__mongoClient) {
    g.__mongoClient = new MongoClient(uri, { maxPoolSize: 10 });
    await g.__mongoClient.connect();
  }
  g.__mongoDb = g.__mongoClient.db();
  return g.__mongoDb as Db;
}
TS

# server: health handler (pure lambda)
cat > packages/server/src/handlers/health.ts <<'TS'
import { APIGatewayProxyHandler } from 'aws-lambda';
import { getDb } from '../lib/mongo';

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const db = await getDb();
    const mongo = db ? 'connected' : 'no-mongo';
    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'ok', mongo }),
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (err: any) {
    console.error('health error', err);
    return { statusCode: 500, body: JSON.stringify({ status: 'error' }) };
  }
};
TS

# server: convenience local dev file to run the handler directly (optional)
cat > packages/server/src/local-dev.ts <<'TS'
import 'dotenv/config';
import { handler } from './handlers/health';
import express from 'express';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());

app.get('/api/health', async (req, res) => {
  const r = await handler({} as any, {} as any, () => null);
  res.status(r.statusCode).set(r.headers as any).send(r.body);
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log('Local server running on http://localhost:' + port));
TS

# client package.json (Vite + React + TS)
cat > packages/client/package.json <<'JSON'
{
  "name": "client",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --port 5173",
    "typecheck": "tsc --noEmit",
    "deploy:s3": "node ./scripts/deploy-s3.js"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "typescript": "^5.6.3",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0"
  }
}
JSON

# client tsconfig
cat > packages/client/tsconfig.json <<'JSON'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "module": "ESNext",
    "target": "ES2022",
    "moduleResolution": "Node",
    "lib": ["ES2022", "DOM"],
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
JSON

# client .env.example
cat > packages/client/.env.example <<'ENV'
VITE_API_URL=http://localhost:3000
ENV

# client index.html + app files
cat > packages/client/index.html <<'HTML'
<!doctype html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Expense Tracker Client</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
HTML

cat > packages/client/src/main.tsx <<'TSX'
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
createRoot(document.getElementById('root')!).render(<App />)
TSX

cat > packages/client/src/App.tsx <<'TSX'
import React, { useEffect, useState } from 'react'
export default function App(){
  const [status, setStatus] = useState<'loading'|'ok'|'error'>('loading')
  useEffect(() => {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    fetch(\`\${base}/api/health\`).then(r => r.json()).then(d => setStatus(d?.status === 'ok' ? 'ok' : 'error')).catch(()=>setStatus('error'))
  },[])
  return (<main style={{fontFamily:'system-ui, sans-serif',padding:20}}>
    <h1>Expense tracker — smoke test</h1>
    <p>API health: <strong>{status}</strong></p>
  </main>)
}
TSX

# client deploy script (sync to s3)
mkdir -p packages/client/scripts
cat > packages/client/scripts/deploy-s3.js <<'NODE'
const { execSync } = require('child_process');
const bucket = process.env.S3_BUCKET;
if (!bucket) { console.error('Missing S3_BUCKET env var'); process.exit(1); }
execSync(`aws s3 sync dist s3://${bucket} --acl public-read --delete`, { stdio: 'inherit' });
console.log('Deployed to', `https://${bucket}.s3.amazonaws.com/index.html`);
NODE

echo "Scaffold done. Run 'pnpm install' then 'pnpm run dev'."
