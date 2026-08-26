"use client";

import { useSyncExternalStore } from "react";

// Force un nouveau rendu chaque seconde via un abonnement plutôt qu'un
// setState direct dans useEffect (règle react-hooks/set-state-in-effect).
// Le snapshot doit changer exactement à chaque notification, ni plus ni
// moins : une valeur qui change à chaque appel (ex. Date.now()) provoque une
// boucle de rendu infinie ("Maximum update depth exceeded"), et une valeur
// CONSTANTE ne redéclenche aucun rendu après le premier (React compare le
// snapshot avant de forcer un rendu suite à l'abonnement). D'où ce compteur
// qui n'avance que dans le setInterval. L'heure elle-même est lue fraîche
// avec `new Date()` dans le corps du composant à chaque rendu.
let tick = 0;
function sAbonner(rafraichir: () => void) {
  const id = setInterval(() => {
    tick++;
    rafraichir();
  }, 1_000);
  return () => clearInterval(id);
}
function snapshotTick() {
  return tick;
}
function snapshotServeur() {
  return -1;
}

// Décompose un intervalle en mois/jours/heures/minutes/secondes de façon
// calendaire (un "mois" a une durée variable, donc pas de simple division
// par une moyenne en millisecondes) : on avance mois par mois depuis
// maintenant jusqu'à juste avant la cible, puis on détaille le reste en
// jours/h/min/s.
function decomposer(cible: Date, maintenant: Date) {
  if (cible <= maintenant) return { mois: 0, jours: 0, heures: 0, minutes: 0, secondes: 0 };

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
  resteMs -= minutes * 1000 * 60;
  const secondes = Math.floor(resteMs / 1000);

  return { mois, jours, heures, minutes, secondes };
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

// Réutilisé sur l'écran de verrouillage (site pas encore ouvert) et sur la
// page de dépôt de liste (rappel de la date du troc) — voir dateCibleIso,
// piloté par le champ "Date d'ouverture" du dashboard.
export function CompteARebours({ dateCibleIso }: { dateCibleIso: string }) {
  const cible = new Date(dateCibleIso);
  const tickActuel = useSyncExternalStore(sAbonner, snapshotTick, snapshotServeur);

  if (tickActuel === -1 || Number.isNaN(cible.getTime())) return null;

  const { mois, jours, heures, minutes, secondes } = decomposer(cible, new Date());

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-4">
      <Unite label="mois" valeur={mois} />
      <Separateur />
      <Unite label="jours" valeur={jours} />
      <Separateur />
      <Unite label="heures" valeur={heures} />
      <Separateur />
      <Unite label="minutes" valeur={minutes} />
      <Separateur />
      <Unite label="secondes" valeur={secondes} />
    </div>
  );
}
