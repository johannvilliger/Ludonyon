import "server-only";
import { query } from "@/lib/db";

// Suivi des formulaires de dépôt/modification de liste actuellement ouverts
// dans un navigateur — sert uniquement à vérifier avant un déploiement ou un
// redémarrage du site (voir /gestion/dashboard) qu'aucun vendeur n'est en
// train de taper sa liste. En base (table sessions_actives, migration 0035)
// plutôt qu'en mémoire du processus : une mémoire locale au processus ne
// voit jamais ce qu'écrit un autre processus — invisible en permanence dès
// que l'écriture et la lecture n'atterrissent pas sur le même processus.
export type SessionActive = { label: string };

// Au-delà, on considère l'onglet fermé (le battement côté client toutes les
// 20s a cessé) plutôt que d'afficher une session fantôme indéfiniment.
// Valeur fixe (comme ailleurs dans le code, voir articles_reserves) plutôt
// que paramétrée : un littéral dans INTERVAL évite tout doute sur la liaison
// d'un paramètre à cet endroit précis de la syntaxe SQL.
export async function signalerActiviteEnCours(cle: string, label: string): Promise<void> {
  await query(
    `INSERT INTO sessions_actives (cle, label, derniere_activite) VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE label = VALUES(label), derniere_activite = VALUES(derniere_activite)`,
    [cle, label],
  );
}

export async function listerSessionsActives(): Promise<SessionActive[]> {
  await query("DELETE FROM sessions_actives WHERE derniere_activite < (NOW() - INTERVAL 60 SECOND)");
  return query<SessionActive>("SELECT label FROM sessions_actives ORDER BY derniere_activite ASC");
}
