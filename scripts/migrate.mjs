// Applique les fichiers SQL de db/migrations/ à la base configurée par les
// variables d'environnement (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME).
// Usage : npm run db:migrate
//
// Lit .env.local ou .env s'il en existe un dans le dossier courant (un
// simple `node` ne charge pas ces fichiers automatiquement, contrairement à
// `next dev`/`next build`/`next start`).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import mysql from "mysql2/promise";

const envFile = existsSync(".env.local") ? ".env.local" : existsSync(".env") ? ".env" : null;
if (envFile) loadEnv({ path: envFile });

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "db", "migrations");

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
if (!DB_HOST || !DB_USER || !DB_NAME) {
  console.error(
    "DB_HOST, DB_USER et DB_NAME doivent être définis (variables d'environnement, ou fichier .env.local / .env).",
  );
  process.exit(1);
}

const fichiers = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (fichiers.length === 0) {
  console.log("Aucun fichier de migration trouvé dans db/migrations/.");
  process.exit(0);
}

const connection = await mysql.createConnection({
  host: DB_HOST,
  port: DB_PORT ? Number(DB_PORT) : 3306,
  user: DB_USER,
  password: DB_PASSWORD ?? "",
  database: DB_NAME,
  multipleStatements: true,
});

for (const fichier of fichiers) {
  console.log(`→ ${fichier}`);
  const sql = readFileSync(join(migrationsDir, fichier), "utf8");
  await connection.query(sql);
}

console.log(`${fichiers.length} fichier(s) de migration appliqué(s).`);
await connection.end();
