// Représentation stylisée (pas une reproduction fidèle) des billets/pièces
// suisses, juste pour repérer une valeur au coup d'œil dans les instructions
// de caisse — couleurs officielles des billets (9e série) et teinte
// argent/or des pièces.
const COULEURS_BILLETS: Record<number, string> = {
  10: "#F5C400",
  20: "#DC0032",
  50: "#00A651",
  100: "#0066B3",
  200: "#8B5E3C",
  1000: "#6B2D91",
};

function parseMontant(valeur: string): number {
  const nombre = parseFloat(valeur);
  return valeur.includes("ct") ? nombre / 100 : nombre;
}

function chiffreAffiche(valeur: string): string {
  return valeur.replace(/\s*ct$/, "").replace(/\.–$/, "");
}

function Billet({ montant, chiffre }: { montant: number; chiffre: string }) {
  const couleur = COULEURS_BILLETS[montant] ?? "#71717a";
  return (
    <svg viewBox="0 0 64 32" className="h-6 w-12 shrink-0" aria-hidden="true">
      <rect x="1" y="1" width="62" height="30" rx="4" fill={couleur} stroke="#00000022" />
      <rect x="5" y="5" width="54" height="22" rx="2" fill="none" stroke="#ffffff55" strokeWidth="1" />
      <text x="32" y="21" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff" fontFamily="sans-serif">
        {chiffre}
      </text>
    </svg>
  );
}

function Piece({ montant, chiffre }: { montant: number; chiffre: string }) {
  const doree = montant < 0.5;
  const couleur = doree ? "#C9A227" : "#C7CCD1";
  const trait = doree ? "#8a7018" : "#8b929a";
  // Le trait métal (gris clair sur argenté) manque de contraste pour le
  // chiffre lui-même — un texte plus foncé reste lisible en petite taille.
  const texte = doree ? "#5c4a10" : "#3f3f46";
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6 shrink-0" aria-hidden="true">
      <circle cx="16" cy="16" r="14" fill={couleur} stroke={trait} strokeWidth="1.5" />
      <circle cx="16" cy="16" r="10.5" fill="none" stroke={trait} strokeWidth="0.75" opacity="0.6" />
      <text
        x="16"
        y="20"
        textAnchor="middle"
        fontSize={chiffre.length > 2 ? "8" : "10"}
        fontWeight="700"
        fill={texte}
        fontFamily="sans-serif"
      >
        {chiffre}
      </text>
    </svg>
  );
}

export function VisuelMonnaie({ valeur }: { valeur: string }) {
  const montant = parseMontant(valeur);
  const chiffre = chiffreAffiche(valeur);
  return montant >= 10 ? (
    <Billet montant={montant} chiffre={chiffre} />
  ) : (
    <Piece montant={montant} chiffre={chiffre} />
  );
}
