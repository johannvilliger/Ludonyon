"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";

type PauseRef = { current: number };

const PauseContext = createContext<PauseRef | null>(null);

export function RefreshPauseProvider({ children }: { children: ReactNode }) {
  const pauseCountRef = useRef(0);
  return <PauseContext.Provider value={pauseCountRef}>{children}</PauseContext.Provider>;
}

function usePauseRef(): PauseRef {
  const ctx = useContext(PauseContext);
  if (!ctx) throw new Error("Doit être utilisé sous RefreshPauseProvider");
  return ctx;
}

// Référence stable (même identité à chaque rendu) exposant le compteur de
// pauses actives — à lire via `.current > 0`, jamais recréée donc sûre à
// mettre dans un tableau de dépendances.
export function useAutoRefreshPauseRef(): PauseRef {
  return usePauseRef();
}

// Met l'auto-refresh du dashboard en pause tant que `actif` est vrai — par
// exemple pendant qu'un panneau dépliable (changement de phase, édition d'un
// code...) reste ouvert, pour ne jamais le refermer sous les pieds de la
// personne qui l'a ouvert.
export function useAutoRefreshPause(actif: boolean) {
  const pauseRef = usePauseRef();
  useEffect(() => {
    if (!actif) return;
    pauseRef.current += 1;
    return () => {
      pauseRef.current -= 1;
    };
  }, [actif, pauseRef]);
}
