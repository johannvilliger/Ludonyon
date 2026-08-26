// On exige un numéro de portable (pas de fixe) pour être sûr de pouvoir
// joindre le vendeur en cas de souci pendant le troc : suisse 07x xxx xx xx
// (10 chiffres) ou français +33 6/7 xx xx xx xx (9 chiffres après l'indicatif).

function nettoyer(valeur: string): string {
  const trim = valeur.trim();
  const plus = trim.startsWith("+") ? "+" : "";
  return plus + trim.replace(/\D/g, "");
}

const REGEX_SUISSE = /^07\d{8}$/;
const REGEX_FRANCE = /^\+33[67]\d{8}$/;

export function telephoneValide(valeur: string): boolean {
  const nettoye = nettoyer(valeur);
  return REGEX_SUISSE.test(nettoye) || REGEX_FRANCE.test(nettoye);
}

// Reformate au fil de la saisie (groupes espacés) — fonctionne aussi sur un
// numéro incomplet, pour un effet de masque de saisie en direct.
export function formaterTelephone(valeur: string): string {
  const nettoye = nettoyer(valeur);

  if (nettoye.startsWith("+33")) {
    const chiffres = nettoye.slice(3);
    const groupes = [
      chiffres.slice(0, 1),
      chiffres.slice(1, 3),
      chiffres.slice(3, 5),
      chiffres.slice(5, 7),
      chiffres.slice(7, 9),
    ].filter(Boolean);
    return groupes.length > 0 ? `+33 ${groupes.join(" ")}` : "+33";
  }

  if (nettoye.startsWith("0")) {
    const groupes = [nettoye.slice(0, 3), nettoye.slice(3, 6), nettoye.slice(6, 8), nettoye.slice(8, 10)].filter(
      Boolean,
    );
    return groupes.join(" ");
  }

  return nettoye;
}
