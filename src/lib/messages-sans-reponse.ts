"use server";

import { nouvelId, query } from "./db";
import { emailValide } from "./email-format";
import { ipAppelante } from "./rate-limit";
import { formaterTelephone, telephoneValide } from "./telephone";

export type EnvoiMessageState = { error: string | null; envoye: boolean };

const FENETRE_MS = 60 * 60_000; // 1 heure
const MAX_MESSAGES = 5; // par IP — large marge pour un usage normal, bloque le spam

const compteurs = new Map<string, number[]>();

function quotaDepasse(ip: string): boolean {
  const maintenant = Date.now();
  const horodatages = (compteurs.get(ip) ?? []).filter((t) => maintenant - t < FENETRE_MS);
  if (horodatages.length >= MAX_MESSAGES) {
    compteurs.set(ip, horodatages);
    return true;
  }
  horodatages.push(maintenant);
  compteurs.set(ip, horodatages);
  return false;
}

// Enregistre une question laissée par un visiteur quand le widget "Une
// question ?" n'a pas trouvé de réponse dans la FAQ (voir AssistantTroc.tsx)
// — l'appel à Claude étant pour l'instant désactivé, c'est la seule façon
// pour une question hors FAQ d'arriver jusqu'au comité (voir
// /gestion/dashboard/messages).
export async function envoyerMessageSansReponse(
  _prevState: EnvoiMessageState,
  formData: FormData,
): Promise<EnvoiMessageState> {
  // Honeypot anti-spam : même principe que sur le formulaire de dépôt de
  // liste (voir vendeur/nouveau/actions.ts) — champ masqué qu'un vrai
  // visiteur ne peut pas remplir.
  if (String(formData.get("site_web") ?? "").trim() !== "") {
    return { error: "Impossible d'envoyer votre message, réessayez.", envoye: false };
  }

  const ip = await ipAppelante();
  if (quotaDepasse(ip)) {
    return { error: "Trop de messages envoyés — réessayez dans un moment.", envoye: false };
  }

  const nom = String(formData.get("nom") ?? "").trim();
  const telephone = formaterTelephone(String(formData.get("telephone") ?? ""));
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!nom) return { error: "Le nom est obligatoire.", envoye: false };
  if (nom.length < 2) return { error: "Le nom doit contenir au moins 2 caractères.", envoye: false };
  if (!telephone || !telephoneValide(telephone)) {
    return { error: "Merci d'indiquer un numéro de portable valide (suisse 07x ou français +33 6/7).", envoye: false };
  }
  if (!email || !emailValide(email)) return { error: "Merci d'indiquer une adresse email valide.", envoye: false };
  if (!message) return { error: "Votre question ne peut pas être vide.", envoye: false };
  if (message.length > 1000) return { error: "Votre question est trop longue (1000 caractères max).", envoye: false };

  await query("INSERT INTO messages_assistant (id, nom, telephone, email, message) VALUES (?, ?, ?, ?, ?)", [
    nouvelId(),
    nom,
    telephone,
    email,
    message,
  ]);

  return { error: null, envoye: true };
}
