"use client";

import { useActionState } from "react";
import { changePassword, type ChangePasswordState } from "@/lib/actions/profile";

const initialState: ChangePasswordState = {};

export default function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(
    changePassword,
    initialState
  );

  return (
    <form
      action={formAction}
      className="mt-3 space-y-4 rounded-xl border border-stone-200 bg-white p-4"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">
          Mot de passe actuel
        </label>
        <input
          type="password"
          name="currentPassword"
          required
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">
          Nouveau mot de passe
        </label>
        <input
          type="password"
          name="newPassword"
          required
          minLength={8}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">
          Confirmer le nouveau mot de passe
        </label>
        <input
          type="password"
          name="confirmPassword"
          required
          minLength={8}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Mot de passe mis à jour.
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600 disabled:opacity-60"
      >
        {isPending ? "Enregistrement…" : "Mettre à jour"}
      </button>
    </form>
  );
}
