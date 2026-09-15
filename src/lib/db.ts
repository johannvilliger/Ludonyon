import "server-only";
import mysql from "mysql2/promise";
import { headers } from "next/headers";
import { randomUUID, randomBytes } from "node:crypto";

const pools = new Map<string, mysql.Pool>();

function configDepuisEnv(suffixe: "" | "_TEST") {
  const host = process.env[`DB_HOST${suffixe}`];
  const user = process.env[`DB_USER${suffixe}`];
  const name = process.env[`DB_NAME${suffixe}`];
  if (!host || !user || !name) return null;
  return {
    host,
    port: process.env[`DB_PORT${suffixe}`] ? Number(process.env[`DB_PORT${suffixe}`]) : 3306,
    user,
    password: process.env[`DB_PASSWORD${suffixe}`] ?? "",
    database: name,
  };
}

// Instance de test : même site Infomaniak, même process Node, mais un
// sous-domaine dédié (TEST_HOSTNAME) qui bascule sur une base séparée
// (DB_*_TEST) — pour tester listes/accueil/caisses sans jamais toucher à
// l'édition réelle. Si TEST_HOSTNAME n'est pas défini (déploiement normal,
// et tout l'environnement de dev), ce chemin n'est jamais emprunté : aucun
// changement de comportement par rapport à avant, et surtout jamais d'appel
// à headers() en dehors d'une requête.
async function cleInstance(): Promise<"test" | "prod"> {
  const hoteTest = process.env.TEST_HOSTNAME?.toLowerCase().trim();
  if (!hoteTest) return "prod";
  const jar = await headers();
  const hote = (jar.get("host") ?? "").split(":")[0].toLowerCase();
  return hote === hoteTest ? "test" : "prod";
}

async function getPool(): Promise<mysql.Pool> {
  const cle = await cleInstance();
  let pool = pools.get(cle);
  if (!pool) {
    const config = configDepuisEnv(cle === "test" ? "_TEST" : "");
    if (!config) {
      throw new Error(
        cle === "test"
          ? "DB_HOST_TEST, DB_USER_TEST et DB_NAME_TEST doivent être définis pour l'instance de test (voir .env.local.example)."
          : "DB_HOST, DB_USER, DB_PASSWORD et DB_NAME doivent être définis (voir .env.local.example).",
      );
    }
    pool = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: true,
    });
    pools.set(cle, pool);
  }
  return pool;
}

export async function query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  const pool = await getPool();
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}

export async function queryOne<T = unknown>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(fn: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const pool = await getPool();
  const conn = await pool.getConnection();
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
    // Uniquement parmi les numéros < 900 : au-delà, ce sont les bénévoles et
    // les vendeurs spéciaux 901/902 (numéros fixes, voir migration 0007),
    // jamais réattribués aux vendeurs clients.
    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT COALESCE(MAX(numero_vendeur), 0) + 1 AS suivant FROM participations WHERE edition_id = ? AND numero_vendeur < 900",
      [editionId],
    );
    const suivant = rows[0].suivant as number;
    if (suivant >= 900) {
      throw new Error("Plus de numéro de vendeur disponible dans la plage 1-899.");
    }
    return suivant;
  } finally {
    await conn.query("SELECT RELEASE_LOCK(?)", [lockName]);
  }
}
