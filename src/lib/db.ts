//src/lib/db.ts
import mysql from "mysql2/promise";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta variable de entorno ${name}. Configura DB_HOST, DB_PORT, DB_USER, DB_PASSWORD y DB_NAME en .env.local.`,
    );
  }
  return value;
}

function createPool() {
  return mysql.createPool({
    host: requiredEnv("DB_HOST"),
    port: Number(process.env.DB_PORT || 3306),
    user: requiredEnv("DB_USER"),
    password: requiredEnv("DB_PASSWORD"),
    database: requiredEnv("DB_NAME"),
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
  });
}

declare global {
  // eslint-disable-next-line no-var
  var __mysqlPool: ReturnType<typeof createPool> | undefined;
}

export function getPool() {
  if (!globalThis.__mysqlPool) {
    globalThis.__mysqlPool = createPool();
  }
  return globalThis.__mysqlPool;
}
