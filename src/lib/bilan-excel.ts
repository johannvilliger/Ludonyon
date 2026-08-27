import "server-only";
import ExcelJS from "exceljs";
import { query, queryOne } from "@/lib/db";

type Edition = { annee: number; taux_vendeur: number };
type VendeurLigne = {
  numero_vendeur: number;
  nom_vendeur: string;
  telephone: string | null;
  email: string | null;
  est_benevole: number;
  nb_articles: number;
  nb_vendus: number;
  montant_recu: number;
};

// Même requête que la liste imprimable (voir bilans/[editionId]/imprimer) :
// les deux doivent toujours afficher les mêmes chiffres.
async function chargerVendeurs(editionId: string, tauxVendeur: number): Promise<VendeurLigne[]> {
  return query<VendeurLigne>(
    `SELECT
       p.numero_vendeur,
       v.nom AS nom_vendeur,
       v.telephone,
       v.email,
       p.est_benevole,
       COUNT(a.id) AS nb_articles,
       COALESCE(SUM(CASE WHEN a.statut = 'vendu' THEN 1 ELSE 0 END), 0) AS nb_vendus,
       COALESCE(SUM(CASE WHEN a.statut = 'vendu' THEN
         CASE
           WHEN p.numero_vendeur IN (901, 902) THEN 0
           WHEN p.est_benevole = 1 THEN a.prix
           ELSE ROUND(a.prix * (1 - ?), 2)
         END
       ELSE 0 END), 0) AS montant_recu
     FROM participations p
     JOIN vendeurs v ON v.id = p.vendeur_id
     LEFT JOIN articles a ON a.participation_id = p.id
     WHERE p.edition_id = ?
     GROUP BY p.id, p.numero_vendeur, v.nom, v.telephone, v.email, p.est_benevole
     ORDER BY p.numero_vendeur`,
    [tauxVendeur, editionId],
  );
}

// Génère le classeur en mémoire et le renvoie en base64 : les server actions
// Next.js ne sérialisent pas un Buffer binaire tel quel à travers la
// frontière client/serveur, le base64 est le format le plus sûr à décoder
// ensuite côté client pour reconstituer le fichier.
export async function genererExcelBilan(editionId: string): Promise<{ base64: string; nomFichier: string }> {
  const edition = await queryOne<Edition>("SELECT annee, taux_vendeur FROM editions WHERE id = ?", [editionId]);
  if (!edition) throw new Error("Édition introuvable.");

  const vendeurs = await chargerVendeurs(editionId, Number(edition.taux_vendeur));

  const classeur = new ExcelJS.Workbook();
  const feuille = classeur.addWorksheet(`Bilan ${edition.annee}`);

  feuille.columns = [
    { header: "N°", key: "numero", width: 8 },
    { header: "Vendeur", key: "nom", width: 28 },
    { header: "Bénévole", key: "benevole", width: 10 },
    { header: "Téléphone", key: "telephone", width: 16 },
    { header: "Email", key: "email", width: 28 },
    { header: "En vente", key: "enVente", width: 10 },
    { header: "Vendus", key: "vendus", width: 10 },
    { header: "Reçu (CHF)", key: "recu", width: 12 },
  ];
  feuille.getRow(1).font = { bold: true };

  for (const v of vendeurs) {
    feuille.addRow({
      numero: v.numero_vendeur,
      nom: v.nom_vendeur,
      benevole: v.est_benevole ? "Oui" : "",
      telephone: v.telephone ?? "",
      email: v.email ?? "",
      enVente: Number(v.nb_articles),
      vendus: Number(v.nb_vendus),
      recu: Number(v.montant_recu),
    });
  }
  feuille.getColumn("recu").numFmt = "0.00";

  const buffer = await classeur.xlsx.writeBuffer();
  return {
    base64: Buffer.from(buffer).toString("base64"),
    nomFichier: `bilan-${edition.annee}.xlsx`,
  };
}
