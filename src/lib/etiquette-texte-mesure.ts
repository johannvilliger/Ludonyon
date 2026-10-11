// Mesure de texte partagée entre EtiquetteArticleNom (nom dans le coin de
// l'étiquette normale) et EtiquetteTexteSeul (nom en entier sur toute
// l'étiquette) — même mécanisme (Canvas, API navigateur) et même échelle
// mm <-> px, pour ne pas dupliquer trois fois la même conversion.
const PX_PAR_MM = 96 / 25.4;

let ctxMesure: CanvasRenderingContext2D | null = null;

export function largeurTexteMm(texte: string, tailleMm: number): number {
  if (!ctxMesure) ctxMesure = document.createElement("canvas").getContext("2d");
  if (!ctxMesure) return 0;
  ctxMesure.font = `700 ${tailleMm * PX_PAR_MM}px Arial`;
  return ctxMesure.measureText(texte).width / PX_PAR_MM;
}

// Nombre de lignes nécessaires si le texte est renvoyé mot par mot dans
// largeurUtileMm à la taille donnée — simule le retour à la ligne naturel
// du navigateur (white-space normal) pour prédire combien de lignes
// -webkit-line-clamp devra autoriser.
export function compterLignes(texte: string, tailleMm: number, largeurUtileMm: number): number {
  const mots = texte.split(" ");
  let ligne = "";
  let lignes = 1;
  for (const mot of mots) {
    const essai = ligne ? `${ligne} ${mot}` : mot;
    if (ligne && largeurTexteMm(essai, tailleMm) > largeurUtileMm) {
      lignes++;
      ligne = mot;
    } else {
      ligne = essai;
    }
  }
  return lignes;
}
