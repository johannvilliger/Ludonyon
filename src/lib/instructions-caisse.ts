export const INSTRUCTIONS_CAISSE = {
  fondDeCaisse:
    "Dans chaque caisse, il y a un fond de caisse de 250.– à vérifier dès maintenant.",
  // Détail du fond de caisse en pièces/billets, plutôt qu'une seule longue
  // chaîne en petits caractères — affiché en grille dans instructions-modal.tsx
  // pour rester lisible.
  detailFond: [
    { qte: 1, valeur: "50.–" },
    { qte: 4, valeur: "20.–" },
    { qte: 4, valeur: "10.–" },
    { qte: 6, valeur: "5.–" },
    { qte: 10, valeur: "2.–" },
    { qte: 11, valeur: "1.–" },
    { qte: 20, valeur: "50 ct" },
    { qte: 30, valeur: "20 ct" },
    { qte: 30, valeur: "10 ct" },
  ],
  etapes: [
    "Scanner le QR Code sur l'article",
    "Si l'acheteur est bénévole, cocher la case « Acheteur bénévole » pour ne pas ajouter les 10%",
    "Contrôler le panier ainsi que le nombre d'articles",
    "Indiquer le montant payé, rendre le montant indiqué",
    "Encaisser",
  ],
};

export const INSTRUCTIONS_CLOTURE = {
  titre: "Pour clôturer et contrôler votre caisse :",
  etapes: [
    "Enlevez les 250.– de fond de caisse.",
    "Comptez le reste.",
    "Indiquez ci-dessous le montant réel de votre caisse (sans les 250.–).",
  ],
};
