"use client";

import { useSyncExternalStore } from "react";

// Force un nouveau rendu toutes les 15s via un abonnement plutôt qu'un
// setState direct dans useEffect (règle react-hooks/set-state-in-effect).
// Le snapshot renvoie une valeur CONSTANTE (true côté client, false côté
// serveur) : useSyncExternalStore exige que getSnapshot ne change qu'entre
// deux notifications de l'abonnement, sous peine de boucle infinie — c'est
// l'appel à rafraichir() qui déclenche le nouveau rendu, pas une variation
// du snapshot. L'heure elle-même est lue fraîche avec `new Date()` dans le
// corps du composant à chaque rendu.
function sAbonner(rafraichir: () => void) {
  const id = setInterval(rafraichir, 15_000);
  return () => clearInterval(id);
}
function estPret() {
  return true;
}
function pasEncorePret() {
  return false;
}

// Décompose un intervalle en mois/jours/heures/minutes de façon calendaire
// (un "mois" a une durée variable, donc pas de simple division par une
// moyenne en millisecondes) : on avance mois par mois depuis maintenant
// jusqu'à juste avant la cible, puis on détaille le reste en jours/h/min.
function decomposer(cible: Date, maintenant: Date) {
  if (cible <= maintenant) return { mois: 0, jours: 0, heures: 0, minutes: 0 };

  let mois = (cible.getFullYear() - maintenant.getFullYear()) * 12 + (cible.getMonth() - maintenant.getMonth());
  let curseur = new Date(maintenant);
  curseur.setMonth(curseur.getMonth() + mois);
  if (curseur > cible) {
    mois -= 1;
    curseur = new Date(maintenant);
    curseur.setMonth(curseur.getMonth() + mois);
  }

  let resteMs = cible.getTime() - curseur.getTime();
  const jours = Math.floor(resteMs / (1000 * 60 * 60 * 24));
  resteMs -= jours * 1000 * 60 * 60 * 24;
  const heures = Math.floor(resteMs / (1000 * 60 * 60));
  resteMs -= heures * 1000 * 60 * 60;
  const minutes = Math.floor(resteMs / (1000 * 60));

  return { mois, jours, heures, minutes };
}

function Digit({ value }: { value: number }) {
  return (
    <div className="relative h-8 w-5 overflow-hidden rounded bg-zinc-900 sm:h-11 sm:w-7">
      <div
        className="absolute inset-x-0 top-0 transition-transform duration-500 ease-out"
        style={{ transform: `translateY(-${value * 10}%)` }}
      >
        {Array.from({ length: 10 }, (_, d) => (
          <div
            key={d}
            className="flex h-8 items-center justify-center font-mono text-lg font-semibold tabular-nums text-white sm:h-11 sm:text-2xl"
          >
            {d}
          </div>
        ))}
      </div>
    </div>
  );
}

function NumberFlip({ value, digits }: { value: number; digits: number }) {
  const chiffres = String(Math.max(0, value)).padStart(digits, "0").split("");
  return (
    <div className="flex gap-0.5 sm:gap-1">
      {chiffres.map((c, i) => (
        <Digit key={i} value={Number(c)} />
      ))}
    </div>
  );
}

function Unite({ label, valeur }: { label: string; valeur: number }) {
  return (
    <div className="flex flex-col items-center">
      <NumberFlip value={valeur} digits={2} />
      <span className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs">
        {label}
      </span>
    </div>
  );
}

function Separateur() {
  return <span className="pb-4 text-xl font-semibold text-zinc-300 sm:pb-5">:</span>;
}

export function CountdownVerrouillage({ dateCibleIso }: { dateCibleIso: string }) {
  const cible = new Date(dateCibleIso);
  const pret = useSyncExternalStore(sAbonner, estPret, pasEncorePret);

  if (!pret || Number.isNaN(cible.getTime())) return null;

  const { mois, jours, heures, minutes } = decomposer(cible, new Date());

  return (
    <div className="flex items-end justify-center gap-3 sm:gap-5">
      <Unite label="mois" valeur={mois} />
      <Separateur />
      <Unite label="jours" valeur={jours} />
      <Separateur />
      <Unite label="heures" valeur={heures} />
      <Separateur />
      <Unite label="minutes" valeur={minutes} />
    </div>
  );
}
