import "server-only";
import mysql from "mysql2";
import { query } from "@/lib/db";

// Ordre sans importance : FOREIGN_KEY_CHECKS est désactivé le temps de
// l'import, donc pas besoin de respecter les dépendances entre tables.
const TABLES = [
  "editions",
  "vendeurs",
  "categories",
  "participations",
  "articles",
  "caisses",
  "ventes",
  "vente_articles",
  "mouvements_caisse",
  "clotures",
  "postes_caisse",
  "parametres_gestion",
  "benevoles",
];

const TAILLE_LOT = 200;

async function colonnesInseribles(table: string): Promise<string[]> {
  const rows = await query<{ COLUMN_NAME: string }>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND EXTRA NOT LIKE '%GENERATED%'
     ORDER BY ORDINAL_POSITION`,
    [table],
  );
  return rows.map((r) => r.COLUMN_NAME);
}

// Sauvegarde logique complète, générée en JS via mysql2 (pas de dépendance
// au binaire `mysqldump`, pas garanti disponible sur l'hébergement) : un
// simple fichier .sql à garder de côté, réimportable tel quel
// (`mysql -u ... base < fichier.sql`) en cas de pépin pendant la vente.
export async function genererSauvegardeSql(): Promise<string> {
  const lignes: string[] = [
    `-- Sauvegarde Troc de la ludothèque — ${new Date().toISOString()}`,
    "-- Pour restaurer : mysql -u <user> -p <base> < ce_fichier.sql",
    "SET NAMES utf8mb4;",
    "SET FOREIGN_KEY_CHECKS = 0;",
    "",
  ];

  for (const table of TABLES) {
    const colonnes = await colonnesInseribles(table);
    if (colonnes.length === 0) continue;

    const rows = await query<Record<string, unknown>>(
      `SELECT ${colonnes.map((c) => `\`${c}\``).join(", ")} FROM \`${table}\``,
    );

    lignes.push(`-- ${table} (${rows.length} ligne${rows.length > 1 ? "s" : ""})`);
    lignes.push(`DELETE FROM \`${table}\`;`);

    for (let i = 0; i < rows.length; i += TAILLE_LOT) {
      const lot = rows.slice(i, i + TAILLE_LOT);
      const valeurs = lot
        .map((row) => `(${colonnes.map((c) => mysql.escape(row[c] as mysql.SqlValue)).join(", ")})`)
        .join(",\n  ");
      lignes.push(
        `INSERT INTO \`${table}\` (${colonnes.map((c) => `\`${c}\``).join(", ")}) VALUES\n  ${valeurs};`,
      );
    }
    lignes.push("");
  }

  lignes.push("SET FOREIGN_KEY_CHECKS = 1;");
  return lignes.join("\n");
}
