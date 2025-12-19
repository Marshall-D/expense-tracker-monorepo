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
