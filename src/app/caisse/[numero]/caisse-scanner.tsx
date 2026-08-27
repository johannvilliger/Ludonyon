"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { arrondiCentimes, formaterMontant } from "@/lib/argent";
import { estVendeurSpecial } from "@/lib/vendeurs-speciaux";
import { CameraScanner } from "./camera-scanner";
import {
  encaisserPanier,
  libererArticle,
  rechercherArticle,
  type ArticleTrouve,
} from "./actions";

// navigator.userAgent est statique le temps de la session : pas besoin de
// s'abonner à un vrai changement, juste de lire une valeur qui n'existe que
// côté client (useSyncExternalStore gère proprement l'écart serveur/client
// sans provoquer d'erreur d'hydratation).
function detecterMobile(): boolean {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
function sAbonner() {
  return () => {};
}
function snapshotServeur() {
  return false;
}

function prixAffiche(article: ArticleTrouve, acheteurBenevole: boolean, tauxAchat: number) {
  if (acheteurBenevole && estVendeurSpecial(article.numeroVendeur)) return 0;
  return acheteurBenevole ? article.prix : arrondiCentimes(article.prix * (1 + tauxAchat));
}

export function CaisseScanner({
  caisseId,
  editionId,
  tauxAchat,
}: {
  caisseId: string;
  editionId: string;
  tauxAchat: number;
}) {
  const [panier, setPanier] = useState<ArticleTrouve[]>([]);
  const [acheteurBenevole, setAcheteurBenevole] = useState(false);
  const [montantRecu, setMontantRecu] = useState("");
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [scannerCameraOuvert, setScannerCameraOuvert] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const estMobile = useSyncExternalStore(sAbonner, detecterMobile, snapshotServeur);

  // Utilisé à la fois par la saisie manuelle/scanner USB (formulaire texte)
  // et par le scan caméra — un seul chemin pour chercher l'article et
  // l'ajouter au panier.
  async function traiterCode(valeur: string): Promise<{ ok: true; nom: string } | { ok: false; erreur: string }> {
    const resultat = await rechercherArticle(editionId, valeur, caisseId);
    if (!resultat.ok) return { ok: false, erreur: resultat.error };

    if (panier.some((a) => a.articleId === resultat.article.articleId)) {
      return { ok: false, erreur: `« ${resultat.article.nom} » est déjà dans le panier.` };
    }

    setPanier((prev) => [...prev, resultat.article]);
    return { ok: true, nom: resultat.article.nom };
  }

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    const valeur = code.trim();
    setCode("");
    inputRef.current?.focus();
    if (!valeur) return;

    setErreur(null);
    setConfirmation(null);

    const resultat = await traiterCode(valeur);
    if (!resultat.ok) setErreur(resultat.erreur);
  }

  async function handleCameraScan(valeur: string) {
    const resultat = await traiterCode(valeur);
    return resultat.ok ? { ok: true, message: `✓ ${resultat.nom}` } : { ok: false, message: resultat.erreur };
  }

  function retirer(articleId: string) {
    setPanier((prev) => prev.filter((a) => a.articleId !== articleId));
    void libererArticle(articleId, caisseId);
  }

  async function handleEncaisser() {
    setEnCours(true);
    setErreur(null);
    const resultat = await encaisserPanier(
      caisseId,
      editionId,
      acheteurBenevole,
      panier.map((a) => a.articleId),
    );
    setEnCours(false);

    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }

    setConfirmation(`Encaissé : ${formaterMontant(resultat.total)}`);
    setPanier([]);
    setAcheteurBenevole(false);
    setMontantRecu("");
    inputRef.current?.focus();
  }

  const total = arrondiCentimes(panier.reduce((sum, a) => sum + prixAffiche(a, acheteurBenevole, tauxAchat), 0));
  const montantRecuNombre = Number(montantRecu) || 0;
  const rendu = arrondiCentimes(montantRecuNombre - total);

  return (
    <div>
      <form onSubmit={handleScan} className="flex gap-2">
        <input
          ref={inputRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Scanner ou taper le code (ex. 142-07-8)"
          autoFocus
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 font-mono"
        />
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:border-zinc-400"
        >
          Ajouter
        </button>
      </form>

      {estMobile && (
        <button
          type="button"
          onClick={() => setScannerCameraOuvert(true)}
          className="mt-2 w-full rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:border-zinc-400"
        >
          📷 Scanner avec l&apos;appareil photo
        </button>
      )}
      {scannerCameraOuvert && (
        <CameraScanner onScan={handleCameraScan} onClose={() => setScannerCameraOuvert(false)} />
      )}

      {erreur && <p className="mt-3 text-sm text-red-600">{erreur}</p>}
      {confirmation && <p className="mt-3 text-sm text-green-700">{confirmation}</p>}

      <label className="mt-6 flex items-center gap-2 text-sm font-medium text-zinc-700">
        <input
          type="checkbox"
          checked={acheteurBenevole}
          onChange={(e) => setAcheteurBenevole(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300"
        />
        Acheteur bénévole
      </label>

      <ul className="mt-4 divide-y divide-zinc-200 rounded-md border border-zinc-200">
        {panier.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-zinc-400">Panier vide</li>
        )}
        {panier.map((a) => (
          <li key={a.articleId} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">{a.nom}</p>
              <p className="text-xs text-zinc-500">
                Vendeur #{a.numeroVendeur} — {a.nomVendeur}
                {a.estBenevole && " (bénévole)"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm">{formaterMontant(prixAffiche(a, acheteurBenevole, tauxAchat))}</span>
              <button
                type="button"
                onClick={() => retirer(a.articleId)}
                aria-label="Retirer du panier"
                className="text-lg text-zinc-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between">
        <span className="text-lg font-medium">Total : {formaterMontant(total)}</span>
      </div>

      {panier.length > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <label className="text-sm font-medium text-zinc-700" htmlFor="montant-recu">
            Montant reçu
          </label>
          <input
            id="montant-recu"
            type="number"
            min={0}
            step="any"
            value={montantRecu}
            onChange={(e) => setMontantRecu(e.target.value)}
            placeholder="CHF"
            className="w-28 rounded-md border border-zinc-300 px-3 py-2"
          />
          {montantRecu.trim() !== "" && (
            <span className={rendu < 0 ? "text-sm font-medium text-red-600" : "text-sm font-medium text-emerald-700"}>
              {rendu < 0 ? `Il manque ${formaterMontant(Math.abs(rendu))}` : `Rendu à donner : ${formaterMontant(rendu)}`}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleEncaisser}
          disabled={panier.length === 0 || enCours}
          className="rounded-md bg-zinc-900 px-6 py-3 font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {enCours ? "Encaissement…" : "Encaisser"}
        </button>
      </div>
    </div>
  );
}
