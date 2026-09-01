"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArticleListEditor } from "@/components/ArticleListEditor";
import { CONDITIONS_TROC } from "@/lib/conditions";
import { emailValide } from "@/lib/email-format";
import { formaterTelephone, telephoneValide } from "@/lib/telephone";
import { creerListeAccueil, type FormState } from "./actions";

const initialState: FormState = { error: null };

export default function NouvelleListeAccueilPage() {
  const [state, formAction, pending] = useActionState(creerListeAccueil, initialState);
  const [articlesValides, setArticlesValides] = useState(true);
  // Champs contrôlés : React réinitialise les inputs non-contrôlés après une
  // soumission de formulaire via Server Action, même en cas d'erreur.
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [conditionsAcceptees, setConditionsAcceptees] = useState(false);
  const telephoneRempli = telephone.trim().length > 0;
  const telephoneInvalide = telephoneRempli && !telephoneValide(telephone);
  const nomRempli = nom.trim().length > 0;
  const nomInvalide = nomRempli && nom.trim().length < 3;
  const emailRempli = email.trim().length > 0;
  const emailInvalide = emailRempli && !emailValide(email);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link href="/accueil" className="text-sm text-zinc-500 hover:underline">
        ← Accueil
      </Link>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Nouvelle liste sur place</h1>
      <p className="mt-2 text-zinc-600">
        Pour un vendeur qui n&apos;a pas soumis sa liste en ligne au préalable.
      </p>

      <form action={formAction} className="mt-8 space-y-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Nom</span>
            <input
              name="nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              className={
                nomInvalide
                  ? "mt-1 w-full rounded-md border border-red-400 px-3 py-2"
                  : "mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
              }
            />
            {nomInvalide && (
              <span className="mt-1 block text-xs text-red-600">Au moins 3 caractères.</span>
            )}
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Téléphone portable</span>
            <input
              name="telephone"
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(formaterTelephone(e.target.value))}
              placeholder="079 123 45 67"
              required
              className={
                telephoneInvalide
                  ? "mt-1 w-full rounded-md border border-red-400 px-3 py-2"
                  : "mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
              }
            />
            {telephoneInvalide && (
              <span className="mt-1 block text-xs text-red-600">
                Numéro de portable suisse (07x xxx xx xx) ou français (+33 6/7 xx xx xx xx).
              </span>
            )}
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-zinc-700">Email</span>
            <input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={
                emailInvalide
                  ? "mt-1 w-full rounded-md border border-red-400 px-3 py-2"
                  : "mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
              }
            />
            {emailInvalide && (
              <span className="mt-1 block text-xs text-red-600">Adresse email invalide.</span>
            )}
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <input name="est_benevole" type="checkbox" className="h-4 w-4 rounded border-zinc-300" />
          Vendeur bénévole (pas de retenue de 10% sur ses ventes)
        </label>

        <label className="flex items-start gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            name="conditions"
            checked={conditionsAcceptees}
            onChange={(e) => setConditionsAcceptees(e.target.checked)}
            required
            className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300"
          />
          <span>J&apos;accepte les conditions : {CONDITIONS_TROC}</span>
        </label>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={
              pending ||
              !articlesValides ||
              telephoneInvalide ||
              nomInvalide ||
              emailInvalide ||
              !conditionsAcceptees
            }
            className="shrink-0 rounded-md bg-zinc-900 px-6 py-3 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 sm:w-auto"
          >
            {pending ? "Enregistrement…" : "Créer la liste"}
          </button>
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <ArticleListEditor onValiditeChange={setArticlesValides} />
      </form>
    </main>
  );
}
