import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

let pool: pg.Pool | null = null;
let drizzleDb: ReturnType<typeof drizzle> | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }

    let connStr = connectionString;
    if (!connStr.includes('connect_timeout')) {
      const separator = connStr.includes('?') ? '&' : '?';
      connStr = `${connStr}${separator}connect_timeout=30`;
    }

    pool = new pg.Pool({
      connectionString: connStr,
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      max: 10,
    });

    pool.on('error', (err) => {
      console.error('Database pool error:', err.message);
    });
  }
  return pool;
}

// Retry helper for database operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const isRetryable = error.code === 'EAI_AGAIN' ||
                          error.code === 'ECONNREFUSED' ||
                          error.code === 'ETIMEDOUT' ||
                          error.message?.includes('EAI_AGAIN');

      if (isRetryable && attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Database retry ${attempt + 1}/${maxRetries} after ${delay}ms: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

// Lazy-loaded database instance
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    if (!drizzleDb) {
      drizzleDb = drizzle(getPool(), { schema });
    }
    return (drizzleDb as any)[prop];
  }
});
