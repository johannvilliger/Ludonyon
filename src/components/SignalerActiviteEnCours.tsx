"use client";

import { useEffect, useState } from "react";
import { signalerActivite } from "@/lib/sessions-actives-actions";

const INTERVALLE_MS = 20_000;

// Signale au serveur, tant que ce composant reste monté (formulaire de
// dépôt/modification de liste ouvert), qu'une personne est potentiellement
// en train de taper — affiché sur /gestion/dashboard pour éviter de
// déployer/redémarrer le site pendant qu'un vendeur est en plein
// remplissage. Pas de signal explicite à la fermeture de l'onglet
// (beforeunload n'est pas fiable) : l'entrée expire simplement côté serveur
// si les battements s'arrêtent (voir sessions-actives.ts).
export function SignalerActiviteEnCours({ label }: { label: string }) {
  const [cle] = useState(() => crypto.randomUUID());

  useEffect(() => {
    const envoyer = () => {
      signalerActivite(cle, label).catch(() => {});
    };
    envoyer();
    const intervalle = setInterval(envoyer, INTERVALLE_MS);
    return () => clearInterval(intervalle);
  }, [cle, label]);

  return null;
}
