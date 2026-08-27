import "server-only";
import { headers } from "next/headers";
import { envoyerAlerteBruteForce } from "./email";

const FENETRE_MS = 60_000; // 1 minute
const SEUIL_ECHECS = 5;
const BLOCAGE_INITIAL_MS = 60_000; // 1 minute
const BLOCAGE_ESCALADE_MS = 30 * 60_000; // 30 minutes

type EtatCle = {
  echecs: number[]; // horodatages des échecs dans la fenêtre glissante
  bloqueJusqua: number | null;
  // Une fois qu'une clé (IP + formulaire) a déclenché un premier blocage,
  // tout nouveau déclenchement passe directement au blocage de 30 minutes —
  // ce niveau n'est jamais redescendu automatiquement.
  dejaEscalade: boolean;
};

const etats = new Map<string, EtatCle>();

// Purge périodique des entrées inactives depuis longtemps, pour ne pas
// accumuler indéfiniment des IP en mémoire pendant un événement de plusieurs
// heures.
setInterval(
  () => {
    const maintenant = Date.now();
    for (const [cle, etat] of etats) {
      const derniereActivite = etat.bloqueJusqua ?? etat.echecs.at(-1) ?? 0;
      if (maintenant - derniereActivite > BLOCAGE_ESCALADE_MS) etats.delete(cle);
    }
  },
  10 * 60_000,
).unref();

export async function ipAppelante(): Promise<string> {
  const jar = await headers();
  const xff = jar.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return jar.get("x-real-ip") ?? "ip-inconnue";
}

export function verifierBlocage(cle: string): { bloque: boolean; secondesRestantes: number } {
  const etat = etats.get(cle);
  if (!etat?.bloqueJusqua) return { bloque: false, secondesRestantes: 0 };
  const restant = etat.bloqueJusqua - Date.now();
  if (restant <= 0) return { bloque: false, secondesRestantes: 0 };
  return { bloque: true, secondesRestantes: Math.ceil(restant / 1000) };
}

export async function enregistrerEchec(cle: string, ip: string, formulaire: string): Promise<void> {
  const maintenant = Date.now();
  const etat = etats.get(cle) ?? { echecs: [], bloqueJusqua: null, dejaEscalade: false };
  etat.echecs = etat.echecs.filter((t) => maintenant - t < FENETRE_MS);
  etat.echecs.push(maintenant);

  if (etat.echecs.length >= SEUIL_ECHECS) {
    const duree = etat.dejaEscalade ? BLOCAGE_ESCALADE_MS : BLOCAGE_INITIAL_MS;
    etat.bloqueJusqua = maintenant + duree;
    etat.dejaEscalade = true;
    etat.echecs = [];
    etats.set(cle, etat);
    envoyerAlerteBruteForce({ ip, formulaire, dureeMinutes: duree / 60_000 }).catch((err) =>
      console.error("Échec de l'envoi de l'alerte brute-force :", err),
    );
    return;
  }
  etats.set(cle, etat);
}

export function reinitialiserEchecs(cle: string): void {
  const etat = etats.get(cle);
  if (etat) etat.echecs = [];
}
