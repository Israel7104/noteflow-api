import { neon } from '@neondatabase/serverless';

function getSqlClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL no esta configurada.');
  }
  return neon(databaseUrl);
}

export async function query<T = unknown>(text: string, params: unknown[] = []): Promise<T[]> {
  const sql = getSqlClient();
  const result = await sql.query(text, params);
  return result as T[];
}
