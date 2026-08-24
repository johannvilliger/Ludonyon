"use client";

import { useEffect, useLayoutEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

function estChampDeSaisie(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
}

export function AutoRefresh({ intervalMs = 3000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const scrollYRef = useRef<number | null>(null);
  const isPendingRef = useRef(false);
  const saisieEnCoursRef = useRef(false);

  useEffect(() => {
    isPendingRef.current = isPending;
  }, [isPending]);

  useEffect(() => {
    // Tant qu'un champ (montant de vidage, code d'accès...) a le focus, on
    // met totalement en pause le refresh — même si React préserve
    // normalement un champ non contrôlé au travers d'un re-rendu, mieux
    // vaut ne prendre aucun risque de perdre ce que la personne est en
    // train de taper.
    const onFocusIn = (e: FocusEvent) => {
      saisieEnCoursRef.current = estChampDeSaisie(e.target);
    };
    const onFocusOut = () => {
      saisieEnCoursRef.current = false;
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (saisieEnCoursRef.current) return;
      // Si un refresh précédent traîne encore (requête lente), on saute ce
      // tour plutôt que d'écraser scrollYRef avec une position capturée
      // pendant que le DOM était encore en transition — c'est ce qui
      // provoquait le retour en haut de page de façon intermittente.
      if (isPendingRef.current) return;
      scrollYRef.current = window.scrollY;
      startTransition(() => {
        router.refresh();
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  // useLayoutEffect plutôt que useEffect : restaure le scroll avant que le
  // navigateur peigne le nouveau contenu, pour éviter tout flash visible.
  useLayoutEffect(() => {
    if (!isPending && scrollYRef.current !== null) {
      window.scrollTo(0, scrollYRef.current);
      scrollYRef.current = null;
    }
  }, [isPending]);

  return null;
}
