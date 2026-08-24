import "server-only";
import mysql from "mysql2/promise";
import { randomUUID, randomBytes } from "node:crypto";

let pool: mysql.Pool | null = null;

function getPool() {
  if (!pool) {
    const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
    if (!DB_HOST || !DB_USER || !DB_NAME) {
      throw new Error(
        "DB_HOST, DB_USER, DB_PASSWORD et DB_NAME doivent être définis (voir .env.local.example).",
      );
    }
    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT ? Number(DB_PORT) : 3306,
      user: DB_USER,
      password: DB_PASSWORD ?? "",
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: true,
    });
  }
  return pool;
}

export async function query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await getPool().query(sql, params);
  return rows as T[];
}

export async function queryOne<T = unknown>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(fn: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export function nouvelId(): string {
  return randomUUID();
}

export function nouveauCode(): string {
  return randomBytes(6).toString("hex");
}

/**
 * Attribue le numéro de vendeur suivant pour l'édition, de façon sûre en cas
 * de soumissions concurrentes : verrou nommé MariaDB le temps de lire le max
 * et d'insérer — l'équivalent applicatif de pg_advisory_xact_lock côté
 * Postgres, qu'on faisait auparavant dans un trigger.
 */
export async function assignerNumeroVendeur(conn: mysql.PoolConnection, editionId: string): Promise<number> {
  const lockName = `numero_vendeur_${editionId}`;
  const [lockRows] = await conn.query<mysql.RowDataPacket[]>("SELECT GET_LOCK(?, 10) AS acquired", [lockName]);
  if (!lockRows[0]?.acquired) {
    throw new Error("Impossible d'obtenir le verrou pour attribuer le numéro de vendeur.");
  }
  try {
    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT COALESCE(MAX(numero_vendeur), 0) + 1 AS suivant FROM participations WHERE edition_id = ?",
      [editionId],
    );
    return rows[0].suivant as number;
  } finally {
    await conn.query("SELECT RELEASE_LOCK(?)", [lockName]);
  }
}
