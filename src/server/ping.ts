import { getPool } from "@/lib/db";

export async function pingDb(): Promise<number> {
  const pool = getPool();
  const [rows] = await pool.query("SELECT 1+1 AS result");
  return (rows as { result: number }[])[0].result;
}
