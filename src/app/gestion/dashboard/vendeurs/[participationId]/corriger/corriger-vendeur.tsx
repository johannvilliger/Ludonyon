"use client";

import { useState, useTransition } from "react";
import { messageMotInterdit, motInterdit } from "@/lib/articles-interdits";
import { LONGUEUR_MAX_NOM } from "@/lib/validation-articles";
import {
  annulerCorrectionManuelle,
  deplacerArticle,
  envoyerMessageVendeurAction,
  marquerVenduManuellement,
  modifierArticleDashboard,
  rechercherVendeurParNumero,
  supprimerArticleDashboard,
} from "./actions";

type Article = {
  id: string;
  numero_article: number;
  nom: string;
  prix: number;
  statut: string;
  vendu_manuellement: number;
  note_correction: string | null;
};

const STATUT_LABELS: Record<string, string> = {
  non_recu: "Non reçu",
  recu: "Reçu",
  vendu: "Vendu",
  invendu: "Invendu",
  refuse: "Refusé",
};

const STATUT_STYLES: Record<string, string> = {
  non_recu: "bg-zinc-100 text-zinc-600",
  recu: "bg-emerald-100 text-emerald-800",
  vendu: "bg-blue-100 text-blue-800",
  invendu: "bg-amber-100 text-amber-800",
  refuse: "bg-red-100 text-red-800",
};

function ArticleRow({
  article,
  participationId,
  editionId,
}: {
  article: Article;
  participationId: string;
  editionId: string;
}) {
  const [nom, setNom] = useState(article.nom);
  const [prix, setPrix] = useState(String(article.prix));
  const [enregistre, setEnregistre] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [numeroCible, setNumeroCible] = useState("");
  const [cibleResolue, setCibleResolue] = useState<{ numero_vendeur: number; nom_vendeur: string } | null>(null);
  const [erreurDeplacement, setErreurDeplacement] = useState<string | null>(null);
  const [deplacePending, startDeplace] = useTransition();
  const [deplace, setDeplace] = useState(false);

  const [supprimePending, startSupprimer] = useTransition();
  const [supprime, setSupprime] = useState(false);

  const [afficherCorrection, setAfficherCorrection] = useState(false);
  const [noteCorrection, setNoteCorrection] = useState("");
  const [erreurCorrection, setErreurCorrection] = useState<string | null>(null);
  const [correctionPending, startCorrection] = useTransition();
  const [statutCorrige, setStatutCorrige] = useState<"vendu" | "invendu" | null>(null);

  const statutActuel = statutCorrige ?? article.statut;
  const venduManuellement = statutCorrige === "vendu" || (statutCorrige === null && Boolean(article.vendu_manuellement));
  const verrouille = statutActuel === "vendu" || statutActuel === "invendu";

  function confirmerCorrection() {
    const noteTrim = noteCorrection.trim();
    if (!noteTrim) {
      setErreurCorrection("Une note est obligatoire.");
      return;
    }
    startCorrection(async () => {
      setErreurCorrection(null);
      try {
        await marquerVenduManuellement(article.id, participationId, noteTrim);
        setStatutCorrige("vendu");
        setAfficherCorrection(false);
      } catch (err) {
        setErreurCorrection(err instanceof Error ? err.message : "Échec de la correction.");
      }
    });
  }

  function annulerCorrection() {
    if (!window.confirm("Annuler cette correction manuelle ? L'article repasse invendu.")) return;
    startCorrection(async () => {
      setErreurCorrection(null);
      try {
        await annulerCorrectionManuelle(article.id, participationId);
        setStatutCorrige("invendu");
      } catch (err) {
        setErreurCorrection(err instanceof Error ? err.message : "Échec de l'annulation.");
      }
    });
  }
  const mot = nom.trim() ? motInterdit(nom) : null;
  const tropLong = nom.trim().length > LONGUEUR_MAX_NOM;
  const prixInvalide = prix.trim() === "" || Number(prix) <= 0;

  function chercherCible() {
    setErreurDeplacement(null);
    setCibleResolue(null);
    const numero = Number(numeroCible);
    if (!Number.isFinite(numero) || numeroCible.trim() === "") return;
    startDeplace(async () => {
      try {
        const resultat = await rechercherVendeurParNumero(editionId, numero);
        if (!resultat) {
          setErreurDeplacement(`Aucun vendeur n° ${numero} dans cette édition.`);
          return;
        }
        if (resultat.id === participationId) {
          setErreurDeplacement("C'est déjà la liste de cet article.");
          return;
        }
        setCibleResolue({ numero_vendeur: resultat.numero_vendeur, nom_vendeur: resultat.nom_vendeur });
      } catch (err) {
        setErreurDeplacement(err instanceof Error ? err.message : "Échec de la recherche.");
      }
    });
  }

  function confirmerDeplacement() {
    startDeplace(async () => {
      try {
        await deplacerArticle(article.id, participationId, editionId, Number(numeroCible));
        setDeplace(true);
      } catch (err) {
        setErreurDeplacement(err instanceof Error ? err.message : "Échec du déplacement.");
        setCibleResolue(null);
      }
    });
  }

  if (deplace) {
    return (
      <li className="py-3 text-sm text-zinc-400">
        <span className="line-through">
          {String(article.numero_article).padStart(2, "0")} — {article.nom}
        </span>{" "}
        — déplacé vers vendeur #{cibleResolue?.numero_vendeur}
      </li>
    );
  }

  if (supprime) {
    return (
      <li className="py-3 text-sm text-zinc-400">
        <span className="line-through">
          {String(article.numero_article).padStart(2, "0")} — {article.nom}
        </span>{" "}
        — supprimé
      </li>
    );
  }

  return (
    <li className="border-b border-zinc-100 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-6 shrink-0 text-sm text-zinc-400">
          {String(article.numero_article).padStart(2, "0")}
        </span>
        <input
          value={nom}
          disabled={verrouille}
          onChange={(e) => {
            setNom(e.target.value);
            setEnregistre(false);
          }}
          className={
            mot || tropLong
              ? "min-w-0 flex-1 rounded border border-red-400 px-2 py-1 text-sm disabled:bg-zinc-100"
              : "min-w-0 flex-1 rounded border border-zinc-300 px-2 py-1 text-sm disabled:bg-zinc-100"
          }
        />
        <input
          type="number"
          min={1}
          step={1}
          value={prix}
          disabled={verrouille}
          onChange={(e) => {
            setPrix(e.target.value);
            setEnregistre(false);
          }}
          className={
            prixInvalide
              ? "w-20 shrink-0 rounded border border-red-400 px-2 py-1 text-sm disabled:bg-zinc-100"
              : "w-20 shrink-0 rounded border border-zinc-300 px-2 py-1 text-sm disabled:bg-zinc-100"
          }
        />
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_STYLES[statutActuel] ?? "bg-zinc-100 text-zinc-600"}`}>
          {statutActuel === "vendu" && venduManuellement ? "Vendu (correction)" : (STATUT_LABELS[statutActuel] ?? statutActuel)}
        </span>
        {!verrouille && (
          <button
            type="button"
            disabled={pending || Boolean(mot) || tropLong || prixInvalide || enregistre}
            onClick={() =>
              startTransition(async () => {
                setErreur(null);
                try {
                  await modifierArticleDashboard(article.id, participationId, nom, Number(prix));
                  setEnregistre(true);
                } catch (err) {
                  setErreur(err instanceof Error ? err.message : "Échec de l'enregistrement.");
                }
              })
            }
            className="shrink-0 rounded border border-zinc-300 px-2 py-1 text-xs hover:border-zinc-400 disabled:opacity-50"
          >
            {pending ? "…" : enregistre ? "✓" : "Enregistrer"}
          </button>
        )}
        {!verrouille && (
          <button
            type="button"
            disabled={supprimePending}
            onClick={() => {
              if (!window.confirm(`Supprimer l'article « ${article.nom} » ? Irréversible.`)) return;
              startSupprimer(async () => {
                setErreur(null);
                try {
                  await supprimerArticleDashboard(article.id, participationId);
                  setSupprime(true);
                } catch (err) {
                  setErreur(err instanceof Error ? err.message : "Échec de la suppression.");
                }
              });
            }}
            className="shrink-0 rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:border-red-400 hover:bg-red-50 disabled:opacity-50"
          >
            {supprimePending ? "…" : "Supprimer"}
          </button>
        )}
      </div>
      {mot && <p className="mt-1 text-xs text-red-600">{messageMotInterdit(mot)}</p>}
      {!mot && tropLong && (
        <p className="mt-1 text-xs text-red-600">
          Le nom dépasse {LONGUEUR_MAX_NOM} caractères ({nom.trim().length}/{LONGUEUR_MAX_NOM}).
        </p>
      )}
      {!mot && !tropLong && erreur && <p className="mt-1 text-xs text-red-600">{erreur}</p>}

      {!verrouille && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
          <span>Déplacer vers le vendeur n°</span>
          <input
            type="text"
            inputMode="numeric"
            value={numeroCible}
            onChange={(e) => {
              setNumeroCible(e.target.value);
              setCibleResolue(null);
              setErreurDeplacement(null);
            }}
            className="w-16 rounded border border-zinc-300 px-2 py-1"
          />
          {!cibleResolue && (
            <button
              type="button"
              disabled={deplacePending || !numeroCible.trim()}
              onClick={chercherCible}
              className="rounded border border-zinc-300 px-2 py-1 text-xs hover:border-zinc-400 disabled:opacity-50"
            >
              {deplacePending ? "…" : "Rechercher"}
            </button>
          )}
          {cibleResolue && (
            <>
              <span className="text-zinc-700">
                → Vendeur #{cibleResolue.numero_vendeur} — {cibleResolue.nom_vendeur} ?
              </span>
              <button
                type="button"
                disabled={deplacePending}
                onClick={confirmerDeplacement}
                className="rounded bg-zinc-900 px-2 py-1 text-xs text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {deplacePending ? "…" : "Confirmer"}
              </button>
            </>
          )}
        </div>
      )}
      {erreurDeplacement && <p className="mt-1 text-xs text-red-600">{erreurDeplacement}</p>}

      {/* Correction de clôture : un invendu retrouvé manquant au contrôle
          physique peut être crédité manuellement, avec une note
          obligatoire — jamais une vraie vente (voir marquerVenduManuellement).
          Réversible tant que personne n'a reclôturé par-dessus. */}
      {statutActuel === "invendu" && (
        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2">
          {!afficherCorrection ? (
            <button
              type="button"
              onClick={() => setAfficherCorrection(true)}
              className="rounded border border-amber-300 px-2 py-1 text-xs font-medium text-amber-800 hover:border-amber-400"
            >
              Marquer vendu manuellement (retrouvé manquant)
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={noteCorrection}
                onChange={(e) => setNoteCorrection(e.target.value)}
                placeholder="Pourquoi ? (obligatoire)"
                className="min-w-0 flex-1 rounded border border-zinc-300 px-2 py-1 text-xs"
              />
              <button
                type="button"
                disabled={correctionPending || !noteCorrection.trim()}
                onClick={confirmerCorrection}
                className="shrink-0 rounded bg-amber-700 px-2 py-1 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50"
              >
                {correctionPending ? "…" : "Confirmer"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAfficherCorrection(false);
                  setErreurCorrection(null);
                }}
                className="shrink-0 rounded border border-zinc-300 px-2 py-1 text-xs hover:border-zinc-400"
              >
                Annuler
              </button>
            </div>
          )}
          {erreurCorrection && <p className="mt-1 text-xs text-red-600">{erreurCorrection}</p>}
        </div>
      )}

      {statutActuel === "vendu" && venduManuellement && (
        <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 p-2 text-xs text-blue-900">
          <p>
            Correction manuelle{article.note_correction ? ` — ${article.note_correction}` : ""}
            {statutCorrige === "vendu" && !article.note_correction ? ` — ${noteCorrection}` : ""}
          </p>
          <button
            type="button"
            disabled={correctionPending}
            onClick={annulerCorrection}
            className="mt-1 rounded border border-blue-300 px-2 py-1 text-xs font-medium text-blue-800 hover:border-blue-400 disabled:opacity-50"
          >
            {correctionPending ? "…" : "↩ Annuler la correction"}
          </button>
          {erreurCorrection && <p className="mt-1 text-xs text-red-600">{erreurCorrection}</p>}
        </div>
      )}
    </li>
  );
}

export function CorrigerVendeur({
  participation,
  articles,
  messageParDefaut,
}: {
  participation: { id: string; edition_id: string; email: string | null };
  articles: Article[];
  messageParDefaut: string;
}) {
  const [message, setMessage] = useState(messageParDefaut);
  const [envoye, setEnvoye] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-6">
      {articles.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucun article dans cette liste.</p>
      ) : (
        <ul>
          {articles.map((a) => (
            <ArticleRow key={a.id} article={a} participationId={participation.id} editionId={participation.edition_id} />
          ))}
        </ul>
      )}

      <div className="mt-8 rounded-md border border-zinc-200 p-4">
        <h2 className="text-sm font-medium text-zinc-700">Message au client</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Destinataire : {participation.email ?? "aucun email enregistré — l'envoi est impossible"}
        </p>
        <textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setEnvoye(false);
          }}
          rows={8}
          className="mt-2 w-full rounded-md border border-zinc-300 p-2 text-sm"
        />
        <button
          type="button"
          disabled={pending || !participation.email || !message.trim()}
          onClick={() =>
            startTransition(async () => {
              setErreurEnvoi(null);
              try {
                await envoyerMessageVendeurAction(participation.id, message);
                setEnvoye(true);
              } catch (err) {
                setErreurEnvoi(err instanceof Error ? err.message : "Échec de l'envoi.");
              }
            })
          }
          className="mt-3 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? "Envoi…" : "Envoyer"}
        </button>
        {envoye && <p className="mt-2 text-sm text-emerald-700">Message envoyé.</p>}
        {erreurEnvoi && <p className="mt-2 text-sm text-red-600">{erreurEnvoi}</p>}
      </div>
    </div>
  );
}
