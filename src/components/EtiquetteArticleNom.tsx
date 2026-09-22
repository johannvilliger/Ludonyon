"use client";

import { useEffect, useState } from "react";

// Taille max/min en mm et largeur utile du coin bas-gauche de l'étiquette
// (voir .label__name dans globals.css). Mesure réelle de la largeur du
// texte via Canvas plutôt qu'une table de correspondance par nombre de
// caractères : un nom en majuscules n'occupe pas la même largeur qu'un nom
// de même longueur en minuscules.
const TAILLE_MAX_MM = 3.4;
const TAILLE_MIN_MM = 2.2;
const LARGEUR_UTILE_MM = 34.6;
const PX_PAR_MM = 96 / 25.4;

let ctxMesure: CanvasRenderingContext2D | null = null;

function largeurTexteMm(texte: string, tailleMm: number): number {
  if (!ctxMesure) ctxMesure = document.createElement("canvas").getContext("2d");
  if (!ctxMesure) return 0;
  ctxMesure.font = `700 ${tailleMm * PX_PAR_MM}px Arial`;
  return ctxMesure.measureText(texte).width / PX_PAR_MM;
}

export function EtiquetteArticleNom({ nom }: { nom: string }) {
  const [tailleMm, setTailleMm] = useState(TAILLE_MAX_MM);

  useEffect(() => {
    // Mesure via Canvas (API navigateur, indisponible côté serveur) : ne
    // peut se faire qu'après le montage, jamais pendant le rendu — d'où
    // l'effet plutôt qu'un calcul dérivé direct.
    let taille = TAILLE_MAX_MM;
    while (taille > TAILLE_MIN_MM && largeurTexteMm(nom, taille) > LARGEUR_UTILE_MM) {
      taille -= 0.1;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTailleMm(Math.round(taille * 10) / 10);
  }, [nom]);

  return (
    <div className="label__name" style={{ fontSize: `${tailleMm}mm` }}>
      {nom}
    </div>
  );
}
