"use client";

import { useEffect, useLayoutEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ intervalMs = 3000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const scrollYRef = useRef<number | null>(null);
  const isPendingRef = useRef(false);

  useEffect(() => {
    isPendingRef.current = isPending;
  }, [isPending]);

  useEffect(() => {
    const id = setInterval(() => {
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
