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
  const scrollYRef = useRef(0);
  const isPendingRef = useRef(false);
  const saisieEnCoursRef = useRef(false);
  // Marque qu'un refresh vient de se terminer et qu'il faut donc restaurer
  // le scroll juste après — jamais au montage initial (voir l'effet de
  // layout plus bas).
  const restaurerAuProchainCommitRef = useRef(false);

  useEffect(() => {
    isPendingRef.current = isPending;
  }, [isPending]);

  // Suit en continu la position de scroll réelle, y compris PENDANT qu'un
  // refresh est en cours (isPending) — et pas seulement au moment où le
  // refresh démarre. Sur un serveur distant (latence non négligeable, contrairement
  // à localhost), l'ancienne version figeait la position au tout début du
  // refresh puis la réappliquait de force à la fin : si la personne avait
  // continué à faire défiler la page entre-temps, elle se faisait renvoyer
  // en arrière — d'où l'impression que la page « remontait » sans arrêt, et
  // qu'un panneau ouvert plus bas se « refermait » alors qu'il était juste
  // repoussé hors champ par ce recul forcé.
  useEffect(() => {
    const onScroll = () => {
      scrollYRef.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      // tour plutôt que de déclencher un second refresh chevauchant.
      if (isPendingRef.current) return;
      restaurerAuProchainCommitRef.current = true;
      startTransition(() => {
        router.refresh();
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  // useLayoutEffect plutôt que useEffect : restaure le scroll avant que le
  // navigateur peigne le nouveau contenu, pour éviter tout flash visible.
  // Utilise toujours la valeur la PLUS RÉCENTE de scrollYRef (mise à jour en
  // continu ci-dessus), jamais une capture figée avant le refresh.
  useLayoutEffect(() => {
    if (!isPending && restaurerAuProchainCommitRef.current) {
      restaurerAuProchainCommitRef.current = false;
      window.scrollTo(0, scrollYRef.current);
    }
  }, [isPending]);

  return null;
}
