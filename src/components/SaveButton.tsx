"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

// Bouton de soumission pour un <form action={serverAction}> : affiche un
// état "en cours" pendant l'envoi, puis un ✓ vert quelques secondes après
// une soumission réussie. Doit être un enfant direct du <form> pour que
// useFormStatus reflète bien sa soumission.
//
// Le minuteur qui masque le ✓ est stocké dans une ref (pas dans le retour
// de nettoyage du useEffect) : juste après la fin d'un envoi, Next.js
// réconcilie le composant serveur autour de ce bouton, ce qui fait
// repasser `pending` par un état transitoire (`undefined`) — un nettoyage
// d'effet classique annulerait le minuteur à ce moment-là et le ✓
// resterait affiché indéfiniment.
export default function SaveButton({
  children = "Enregistrer",
  className,
  pendingLabel = "…",
}: {
  children?: ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  const [showSaved, setShowSaved] = useState(false);
  const wasPending = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Une nouvelle soumission efface immédiatement un ✓ encore affiché —
  // ajustement pendant le rendu (cf. la doc React "Adjusting state when a
  // prop changes") plutôt qu'un effet, pour ce cas purement synchrone.
  const [prevPending, setPrevPending] = useState(pending);
  if (pending !== prevPending) {
    setPrevPending(pending);
    if (pending) setShowSaved(false);
  }

  useEffect(() => {
    if (pending) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      wasPending.current = true;
      return;
    }
    if (wasPending.current) {
      wasPending.current = false;
      setShowSaved(true);
      hideTimer.current = setTimeout(() => setShowSaved(false), 2500);
    }
  }, [pending]);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    []
  );

  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : showSaved ? "✓ Enregistré" : children}
    </button>
  );
}
