"use client";

import { useActionState, useState } from "react";
import { ArticleListEditor } from "@/components/ArticleListEditor";
import { CONDITIONS_TROC } from "@/lib/conditions";
import { formaterTelephone, telephoneValide } from "@/lib/telephone";
import { soumettreListe, type FormState } from "./actions";

const initialState: FormState = { error: null };

export default function NouvelleListePage() {
  const [state, formAction, pending] = useActionState(soumettreListe, initialState);
  const [articlesValides, setArticlesValides] = useState(true);
  // Champs contrôlés (pas juste `name=`) : React réinitialise les inputs
  // non-contrôlés après une soumission de formulaire via Server Action, même
  // en cas d'erreur — sans ça, le vendeur perdrait ses coordonnées à chaque
  // faute de saisie sur la liste d'articles.
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [conditionsAcceptees, setConditionsAcceptees] = useState(false);
  const telephoneRempli = telephone.trim().length > 0;
  const telephoneInvalide = telephoneRempli && !telephoneValide(telephone);
  const nomRempli = nom.trim().length > 0;
  const nomInvalide = nomRempli && nom.trim().length < 3;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Déposer ma liste</h1>
        <a
          href="/reglement.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:border-zinc-400"
        >
          Règlement (PDF)
        </a>
      </div>
      <p className="mt-2 text-zinc-600">
        Un objet par ligne, avec son prix en francs (pas de centimes). Vous recevrez un numéro de
        vendeur et un code à présenter au dépôt.
      </p>

      <form action={formAction} className="mt-8 space-y-8">
        {/* Honeypot anti-spam : invisible et inatteignable au clavier pour un
            vrai visiteur, mais que la plupart des bots remplissent quand même
            (voir la vérification côté serveur dans actions.ts). */}
        <input
          type="text"
          name="site_web"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        />

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
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
        </div>

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
            disabled={pending || !articlesValides || telephoneInvalide || nomInvalide || !conditionsAcceptees}
            className="shrink-0 rounded-md bg-zinc-900 px-6 py-3 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 sm:w-auto"
          >
            {pending ? "Envoi…" : "Soumettre ma liste"}
          </button>
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <ArticleListEditor onValiditeChange={setArticlesValides} />
      </form>
    </main>
  );
}
