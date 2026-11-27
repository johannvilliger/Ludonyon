import "server-only";
import { nouvelId, query } from "@/lib/db";

// File d'attente générique pour imprimer un PDF déjà entièrement généré
// côté serveur (voir migration 0039) — print-agent le décode et l'envoie
// tel quel à l'imprimante, sans rien reconstruire. Partagé par tous les
// documents "impression centralisée" (étiquettes/PDF de clôture, quittances
// réimprimées depuis l'historique...).
export async function queuerDocumentImpression(nomFichier: string, base64: string): Promise<void> {
  await query("INSERT INTO documents_impression (id, nom_fichier, pdf_base64) VALUES (?, ?, ?)", [
    nouvelId(),
    nomFichier,
    base64,
  ]);
}
