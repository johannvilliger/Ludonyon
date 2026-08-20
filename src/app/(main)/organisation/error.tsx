"use client";

export default function OrganisationError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <p className="font-medium">Une erreur est survenue</p>
      <p className="mt-1">{error.message || "Veuillez réessayer."}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 transition hover:bg-red-100"
      >
        Réessayer
      </button>
    </div>
  );
}
