import Link from "next/link";
import { EtiquetteManuelleForm } from "./etiquette-manuelle-form";

export const dynamic = "force-dynamic";

export default function EtiquetteManuellePage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10 print:m-0 print:max-w-none print:p-0">
      <div className="mb-6 print:hidden">
        <Link href="/accueil" className="text-sm text-zinc-500 hover:underline">
          ← Accueil
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Réimprimer une étiquette</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Pour un article isolé (étiquette perdue, abîmée...) — sans gâcher toute une feuille vierge.
        </p>
      </div>

      <EtiquetteManuelleForm />
    </main>
  );
}
