import { Pool, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var tlgmPool: Pool | undefined;
}

export function getPool() {
  if (global.tlgmPool) return global.tlgmPool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Missing DATABASE_URL.");
  global.tlgmPool = new Pool({ connectionString });
  return global.tlgmPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  return getPool().query<T>(text, params);
}
