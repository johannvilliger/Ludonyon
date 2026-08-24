"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:border-zinc-400 print:hidden"
    >
      Imprimer
    </button>
  );
}
