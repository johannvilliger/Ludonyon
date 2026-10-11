"use client";

import { useEffect, useState } from "react";
import { compterLignes, largeurTexteMm } from "@/lib/etiquette-texte-mesure";

// Taille max/min en mm et largeur utile du coin bas-gauche de l'étiquette
// (voir .label__name dans globals.css). Mesure réelle de la largeur du
// texte via Canvas plutôt qu'une table de correspondance par nombre de
// caractères : un nom en majuscules n'occupe pas la même largeur qu'un nom
// de même longueur en minuscules.
const TAILLE_MAX_MM = 3.4;
const TAILLE_MIN_MM = 2.2;
const LARGEUR_UTILE_MM = 34.6;

// Un nom qui, même à la taille plancher, a besoin de plus de 2 lignes sera
// coupé par -webkit-line-clamp — utilisé pour proposer une étiquette
// "texte seul" en complément (voir nomTropLongPourEtiquetteNormale et la
// page accueil/vendeur/[code]/etiquettes).
export function nomTropLongPourEtiquetteNormale(nom: string): boolean {
  return compterLignes(nom, TAILLE_MIN_MM, LARGEUR_UTILE_MM) > 2;
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
