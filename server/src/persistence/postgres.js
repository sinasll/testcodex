import pg from 'pg';

export function createPostgresPool(connectionString) {
  if (!connectionString) return null;
  return new pg.Pool({ connectionString });
}

export async function ensureSchema(pool) {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS game_history (
      id UUID PRIMARY KEY,
      lobby_id TEXT NOT NULL,
      winner TEXT,
      snapshot JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      lobby_id TEXT NOT NULL,
      actor_id TEXT,
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}
