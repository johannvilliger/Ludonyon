"use client";

import { useTransition } from "react";
import {
  signUpForEvent,
  cancelEventSignup,
  toggleWantsReminder,
  toggleSeekingReplacement,
} from "@/lib/actions/events";

export default function MySignupControls({
  eventId,
  isSignedUp,
  wantsReminder,
  seekingReplacement,
}: {
  eventId: string;
  isSignedUp: boolean;
  wantsReminder: boolean;
  seekingReplacement: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSignupClick() {
    startTransition(async () => {
      if (isSignedUp) {
        await cancelEventSignup(eventId);
      } else {
        await signUpForEvent(eventId);
      }
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={handleSignupClick}
        disabled={isPending}
        className={
          isSignedUp
            ? "rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600 transition hover:bg-stone-100 disabled:opacity-60"
            : "rounded-lg border-2 border-black bg-brand-yellow px-3 py-1.5 text-sm font-semibold text-black transition hover:bg-brand-yellow-dark disabled:opacity-60"
        }
      >
        {isPending ? "…" : isSignedUp ? "Se désinscrire" : "S'inscrire"}
      </button>
      {isSignedUp && (
        <>
          <label className="flex items-center gap-1.5 text-xs text-stone-500">
            <input
              type="checkbox"
              checked={wantsReminder}
              disabled={isPending}
              onChange={() =>
                startTransition(() => toggleWantsReminder(eventId))
              }
              className="h-3.5 w-3.5 rounded border-stone-300 text-brand-blue focus:ring-brand-blue"
            />
            Je veux être notifié·e
          </label>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(() => toggleSeekingReplacement(eventId))
            }
            className={
              seekingReplacement
                ? "text-xs font-medium text-red-600 hover:underline"
                : "text-xs text-stone-500 hover:underline"
            }
          >
            {seekingReplacement
              ? "Annuler la recherche de remplaçant·e"
              : "Je cherche un·e remplaçant·e"}
          </button>
        </>
      )}
    </div>
  );
}
