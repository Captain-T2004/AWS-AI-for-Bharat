/**
 * Server-side only DB connection for Next.js API routes.
 * Connects to the same RDS instance used by Lambdas.
 * Reads credentials from env vars (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD).
 *
 * Pool tuning:
 *  - idleTimeoutMillis: 30 s — kills idle connections before RDS (5 min) does
 *  - keepAlive: true / 10 s — sends TCP keepalives so the socket stays alive
 *  - connectionTimeoutMillis: 10 s — longer timeout for first connection
 */
import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;

  pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME || 'reachezy',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    port: 5432,
    max: 5,
    idleTimeoutMillis: 30_000,       // release idle clients after 30 s
    connectionTimeoutMillis: 10_000, // wait up to 10 s for a new connection
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    ssl: { rejectUnauthorized: false },
  });

  // Log unexpected pool errors so they appear in Next.js dev output
  pool.on('error', (err) => {
    console.error('[pg pool] unexpected error on idle client:', err.message);
    // Destroy the pool so getPool() re-creates it on the next request
    pool = null;
  });

  return pool;
}

/**
 * Run a parameterised query, retrying once if the connection was stale.
 */
export async function query(text: string, params?: unknown[]) {
  try {
    return await getPool().query(text, params);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // If it's a connection issue, blow away the pool and retry once
    if (
      msg.includes('Connection terminated') ||
      msg.includes('connection timeout') ||
      msg.includes('ECONNRESET') ||
      msg.includes('ECONNREFUSED')
    ) {
      console.warn('[pg pool] Stale connection, resetting pool and retrying…');
      pool = null;
      return getPool().query(text, params);
    }
    throw err;
  }
}
