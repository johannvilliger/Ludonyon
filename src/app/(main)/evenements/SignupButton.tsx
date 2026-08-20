"use client";

import { useTransition } from "react";
import { signUpForEvent, cancelEventSignup } from "@/lib/actions/events";

export default function SignupButton({
  eventId,
  isSignedUp,
}: {
  eventId: string;
  isSignedUp: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      if (isSignedUp) {
        await cancelEventSignup(eventId);
      } else {
        await signUpForEvent(eventId);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={
        isSignedUp
          ? "shrink-0 rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600 transition hover:bg-stone-100 disabled:opacity-60"
          : "shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-amber-600 disabled:opacity-60"
      }
    >
      {isPending
        ? "…"
        : isSignedUp
          ? "Se désinscrire"
          : "S'inscrire"}
    </button>
  );
}
