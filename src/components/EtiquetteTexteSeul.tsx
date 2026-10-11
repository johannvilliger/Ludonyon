"use client";

import { useEffect, useState } from "react";
import { compterLignes } from "@/lib/etiquette-texte-mesure";

// Étiquette "texte seul" : nom complet sur toute l'étiquette, logo gardé,
// tout le reste (n°, prix, QR) retiré — pensée comme complément de
// l'étiquette normale pour les noms trop longs pour son coin (voir
// nomTropLongPourEtiquetteNormale dans EtiquetteArticleNom.tsx), pas comme
// un remplacement : pas de QR ici, donc inutilisable seule à la caisse.
const TAILLE_MAX_MM = 4;
const TAILLE_MIN_MM = 2.2;
const LARGEUR_UTILE_MM = 44.1; // 48.5mm - 2x2.2mm de padding
const HAUTEUR_UTILE_MM = 15; // 21mm utile - place pour le logo en haut

export function EtiquetteTexteSeul({ nom }: { nom: string }) {
  const [etat, setEtat] = useState({ tailleMm: TAILLE_MAX_MM, lignes: 1 });

  useEffect(() => {
    let taille = TAILLE_MAX_MM;
    let lignes = compterLignes(nom, taille, LARGEUR_UTILE_MM);
    while (taille > TAILLE_MIN_MM && lignes * taille * 1.12 > HAUTEUR_UTILE_MM) {
      taille -= 0.1;
      lignes = compterLignes(nom, taille, LARGEUR_UTILE_MM);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEtat({ tailleMm: Math.round(taille * 10) / 10, lignes });
  }, [nom]);

  return (
    <div
      className="label__texte-seul"
      style={{ fontSize: `${etat.tailleMm}mm`, WebkitLineClamp: etat.lignes }}
    >
      {nom}
    </div>
  );
}
