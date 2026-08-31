import { redirect } from "next/navigation";
import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import { arrondiCentimes, formaterMontant } from "@/lib/argent";
import { dashboardEstConnecte } from "@/lib/gestion";
import { PRIX_ARTICLES_TEST } from "@/lib/test-data";
import {
  basculerVerrouillageSite,
  changerPhase,
  deconnecterCaisse,
  modifierCodeAccueil,
  modifierCodeCaisse,
  modifierCodeDashboard,
  modifierDateOuverture,
  modifierDateRecuperation,
  refuserConnexionCaisse,
  validerConnexionCaisse,
  type ModeVerrouillage,
  type Phase,
} from "./actions";
import { AutoRefresh } from "./auto-refresh";
import { ClotureVenteButton } from "./cloture-vente-button";
import { CodeEditor } from "./code-editor";
import { DateOuvertureEditor } from "./date-ouverture-editor";
import { EditionForm } from "./edition-form";
import { EditionPanel } from "./edition-panel";
import { Import2025Button } from "./import-2025-button";
import { PhaseButton } from "./phase-button";
import { RefreshPauseProvider } from "./refresh-pause-context";
import { ReouvrirCaisseButton } from "./reouvrir-caisse-button";
import { ResetTestDataButton } from "./reset-test-data-button";
import { SauvegardeButton } from "./sauvegarde-button";
import { SupprimerEditionButton } from "./supprimer-edition-button";
import { TerminerEditionButton } from "./terminer-edition-button";
import { VerrouillageSiteButton } from "./verrouillage-site-button";
import { VidageForm } from "./vidage-form";

export const dynamic = "force-dynamic";

const SEUIL_ALERTE_CAISSE = 2000;

type Edition = { id: string; annee: number; phase: Phase };
type Parametres = {
  code_dashboard: string;
  code_accueil: string;
  mode_verrouillage: ModeVerrouillage;
  date_ouverture_troc: string | null;
  date_recuperation_invendus: string | null;
  derniere_sauvegarde_le: string | null;
};
type PosteLigne = {
  poste_id: string;
  numero: number;
  code_acces: string;
  type: "vente" | "remboursement";
  connecte: number;
  demande_en_attente: number;
  caisse_id: string | null;
  cloturee: number;
  fond_initial: number | null;
  montant_cloture: number | null;
  total_ventes: number;
  total_vidages: number;
  nb_articles_vendus: number;
};
type Totaux = { total_encaisse: number; total_du_vendeurs: number };

const LABELS_PHASE: Record<Phase, string> = {
  depot: "Dépôt en ligne",
  reception: "Réception",
  caisse: "Caisse",
  post_vente: "Post-vente",
};
const ORDRE_PHASES: Phase[] = ["depot", "reception", "caisse", "post_vente"];

function texteDerniereSauvegarde(dateStr: string | null): { texte: string; ancienne: boolean } {
  if (!dateStr) return { texte: "jamais", ancienne: true };
  const minutes = Math.max(0, Math.round((Date.now() - new Date(dateStr.replace(" ", "T")).getTime()) / 60000));
  const ancienne = minutes >= 60;
  if (minutes < 1) return { texte: "à l'instant", ancienne };
  if (minutes < 60) return { texte: `il y a ${minutes} min`, ancienne };
  return { texte: `il y a ${Math.round(minutes / 60)} h`, ancienne };
}

export default async function DashboardGestionPage() {
  if (!(await dashboardEstConnecte())) redirect("/gestion");

  const edition = await queryOne<Edition>("SELECT id, annee, phase FROM editions WHERE active_flag = 1");
  const editionsTerminees = edition
    ? []
    : await query<{ id: string; annee: number }>(
        "SELECT id, annee FROM editions WHERE active_flag IS NULL ORDER BY annee DESC",
      );
  const parametres = await queryOne<Parametres>(
    "SELECT code_dashboard, code_accueil, mode_verrouillage, date_ouverture_troc, date_recuperation_invendus, derniere_sauvegarde_le FROM parametres_gestion WHERE id = 1",
  );
  const edition2025 = await queryOne<{ id: string }>("SELECT id FROM editions WHERE annee = 2025");

  const postes = await query<PosteLigne>(
    `SELECT
       pc.id AS poste_id,
       pc.numero,
       pc.code_acces,
       pc.type,
       pc.connecte,
       pc.demande_en_attente,
       c.id AS caisse_id,
       COALESCE(c.cloturee, 0) AS cloturee,
       c.fond_initial,
       c.montant_cloture,
       COALESCE(SUM(va.prix_encaisse), 0) AS total_ventes,
       COALESCE((SELECT SUM(mc.montant) FROM mouvements_caisse mc WHERE mc.caisse_id = c.id), 0) AS total_vidages,
       COUNT(va.id) AS nb_articles_vendus
     FROM postes_caisse pc
     LEFT JOIN caisses c ON c.poste_caisse_id = pc.id AND c.edition_id = ?
     LEFT JOIN ventes v ON v.caisse_id = c.id
     LEFT JOIN vente_articles va ON va.vente_id = v.id
     GROUP BY pc.id, pc.numero, pc.code_acces, pc.type, pc.connecte, pc.demande_en_attente, c.id, c.cloturee, c.fond_initial, c.montant_cloture
     ORDER BY pc.numero`,
    [edition?.id ?? null],
  );

  const posteRemboursement = postes.find((p) => p.type === "remboursement") ?? null;
  const remboursementsTotal = posteRemboursement?.caisse_id
    ? await queryOne<{ total: number; nb: number }>(
        `SELECT COALESCE(SUM(va.prix_encaisse), 0) AS total, COUNT(*) AS nb
         FROM remboursements r JOIN vente_articles va ON va.id = r.vente_article_id
         WHERE r.caisse_id = ?`,
        [posteRemboursement.caisse_id],
      )
    : null;

  const controlesManquants = edition
    ? await queryOne<{ nb: number }>(
        "SELECT COUNT(*) AS nb FROM participations WHERE edition_id = ? AND statut = 'liste_soumise'",
        [edition.id],
      )
    : null;
  const nbControlesManquants = Number(controlesManquants?.nb ?? 0);

  const totaux = edition
    ? await queryOne<Totaux>(
        `SELECT
           COALESCE(SUM(va.prix_encaisse), 0) AS total_encaisse,
           COALESCE(SUM(
             CASE
               WHEN p.numero_vendeur IN (901, 902) THEN 0
               WHEN p.est_benevole = 1 THEN a.prix
               ELSE ROUND(a.prix * (1 - e.taux_vendeur), 2)
             END
           ), 0) AS total_du_vendeurs
         FROM vente_articles va
         JOIN ventes v ON v.id = va.vente_id
         JOIN articles a ON a.id = va.article_id
         JOIN participations p ON p.id = a.participation_id
         JOIN editions e ON e.id = v.edition_id
         WHERE v.edition_id = ? AND a.statut = 'vendu'`,
        [edition.id],
      )
    : null;

  const totalEncaisse = Number(totaux?.total_encaisse ?? 0);
  const totalDuVendeurs = Number(totaux?.total_du_vendeurs ?? 0);
  const benefice = arrondiCentimes(totalEncaisse - totalDuVendeurs);

  const demandes = postes.filter((p) => p.demande_en_attente);
  const connectees = postes.filter((p) => p.connecte);
  const postesVente = postes.filter((p) => p.type === "vente");
  const postesActifs = postesVente.filter((p) => !p.cloturee);
  const postesClotures = postesVente.filter((p) => p.cloturee);

  return (
    <RefreshPauseProvider>
    <main className="mx-auto w-full max-w-[1600px] px-6 py-12">
      <AutoRefresh />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <div className="flex gap-4">
          <Link href="/gestion/dashboard/bilans" className="text-sm text-zinc-500 hover:underline">
            Bilans →
          </Link>
          <Link href="/gestion/dashboard/benevoles" className="text-sm text-zinc-500 hover:underline">
            Bénévoles →
          </Link>
          <Link href="/gestion/dashboard/vendeurs" className="text-sm text-zinc-500 hover:underline">
            Vendeurs →
          </Link>
          <Link href="/gestion/dashboard/quittances" className="text-sm text-zinc-500 hover:underline">
            Quittances →
          </Link>
        </div>
      </div>

      {/* Édition */}
      <section className="mt-8">
        <h2 className="text-lg font-medium">Édition</h2>
        {!edition && (
          <div className="mt-3">
            <p className="text-sm text-zinc-500">Aucune édition active.</p>
            <div className="mt-3">
              <EditionForm />
            </div>
            {editionsTerminees.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-zinc-500">
                  Éditions terminées (bloquent la réutilisation de leur année)
                </h3>
                <ul className="mt-2 divide-y divide-zinc-200 rounded-md border border-zinc-200">
                  {editionsTerminees.map((e) => (
                    <li key={e.id} className="flex items-center justify-between px-4 py-3 text-sm">
                      <span>{e.annee}</span>
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/gestion/dashboard/bilans/${e.id}`}
                          className="text-zinc-500 hover:underline"
                        >
                          Bilan →
                        </Link>
                        <SupprimerEditionButton editionId={e.id} annee={e.annee} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {edition && (
          <div className="mt-3">
            <EditionPanel resume={`Édition ${edition.annee} — phase actuelle : ${LABELS_PHASE[edition.phase]}`}>
              <div className="flex flex-wrap gap-2">
                {ORDRE_PHASES.map((phase) => (
                  <PhaseButton
                    key={phase}
                    phase={phase}
                    label={LABELS_PHASE[phase]}
                    active={phase === edition.phase}
                    onChange={changerPhase}
                    avertissement={
                      phase === "caisse" && edition.phase === "reception" && nbControlesManquants > 0
                        ? `${nbControlesManquants} vendeur${nbControlesManquants > 1 ? "s" : ""} sans contrôle. Vous pourrez faire les contrôles manquants plus tard depuis la liste des vendeurs.`
                        : undefined
                    }
                  />
                ))}
              </div>
              {edition.phase === "post_vente" && (
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-4">
                  <ClotureVenteButton />
                  <TerminerEditionButton />
                </div>
              )}
            </EditionPanel>
          </div>
        )}
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div>
          {/* Stats globales */}
          {edition && (
        <section>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border border-zinc-200 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Encaissé</p>
              <p className="mt-1 text-2xl font-semibold">{formaterMontant(totalEncaisse)}</p>
            </div>
            <div className="rounded-md border border-zinc-200 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Dû aux vendeurs</p>
              <p className="mt-1 text-2xl font-semibold">{formaterMontant(totalDuVendeurs)}</p>
            </div>
            <div className="rounded-md border border-zinc-200 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Bénéfice</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-700">{formaterMontant(benefice)}</p>
            </div>
          </div>
        </section>
      )}

      {/* Caisses : grandes tuiles ventes/cash/vidage/historique */}
      {edition && (
        <section className="mt-8">
          <h2 className="text-lg font-medium">Caisses</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {postesActifs.map((p) => {
              const ventes = Number(p.total_ventes);
              const vidages = Number(p.total_vidages);
              const fondInitial = p.fond_initial != null ? Number(p.fond_initial) : null;
              const cashEnCaisse = fondInitial != null ? arrondiCentimes(fondInitial + ventes - vidages) : null;
              const enAlerte = cashEnCaisse != null && cashEnCaisse > SEUIL_ALERTE_CAISSE;
              const ouverte = Boolean(p.connecte);

              const tuileClasses = enAlerte
                ? "caisse-alerte rounded-lg border border-red-600 p-4 text-white"
                : ouverte
                  ? "rounded-lg border border-emerald-300 bg-emerald-50 p-4"
                  : "rounded-lg border border-zinc-200 bg-white p-4";

              return (
                <div key={p.poste_id} className={tuileClasses}>
                  <div className="flex items-center justify-between">
                    <span className={`text-lg font-semibold ${enAlerte ? "text-white" : ""}`}>Caisse {p.numero}</span>
                    <Link
                      href={`/gestion/dashboard/historique/${p.numero}`}
                      className={`text-sm hover:underline ${enAlerte ? "text-white" : "text-zinc-500"}`}
                    >
                      Historique →
                    </Link>
                  </div>
                  <p className={`mt-1 text-xs font-medium uppercase tracking-wide ${enAlerte ? "text-white" : ouverte ? "text-emerald-700" : "text-zinc-400"}`}>
                    {ouverte ? "Ouverte" : "Fermée"}
                  </p>
                  {p.caisse_id ? (
                    <>
                      <p className={`mt-2 text-sm ${enAlerte ? "text-white" : "text-zinc-600"}`}>
                        Ventes : {formaterMontant(ventes)} · Cash en caisse :{" "}
                        <span className="font-mono">{cashEnCaisse != null ? formaterMontant(cashEnCaisse) : "—"}</span>
                      </p>
                      <p className={`text-xs ${enAlerte ? "text-white/80" : "text-zinc-400"}`}>
                        (fonds {fondInitial != null ? formaterMontant(fondInitial) : "—"} − vidages {formaterMontant(vidages)})
                      </p>
                      <div className="mt-2">
                        <VidageForm caisseId={p.caisse_id} nbArticlesVendus={Number(p.nb_articles_vendus)} />
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-zinc-400">Pas encore de caisse pour cette édition.</p>
                  )}
                </div>
              );
            })}
          </div>

          {postesClotures.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-zinc-500">Caisses clôturées</h3>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {postesClotures.map((p) => {
                  const theorique = arrondiCentimes(Number(p.total_ventes) - Number(p.total_vidages));
                  const compte = p.montant_cloture != null ? Number(p.montant_cloture) : null;
                  const ecart = compte != null ? arrondiCentimes(compte - theorique) : null;
                  return (
                    <div key={p.poste_id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 opacity-70">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Caisse {p.numero}</span>
                        <Link
                          href={`/gestion/dashboard/historique/${p.numero}`}
                          className="text-xs text-zinc-500 hover:underline"
                        >
                          Historique →
                        </Link>
                      </div>
                      <p className="mt-1 text-xs text-zinc-400">Clôturée</p>
                      <p className="mt-1 text-xs text-zinc-600">
                        Théorique : {formaterMontant(theorique)} · Compté : {compte != null ? formaterMontant(compte) : "—"}
                      </p>
                      {ecart != null && ecart !== 0 && (
                        <p className="text-xs font-medium text-red-600">
                          Écart : {ecart > 0 ? "+" : ""}
                          {formaterMontant(ecart)}
                        </p>
                      )}
                      {p.caisse_id && (
                        <div className="mt-2">
                          <ReouvrirCaisseButton caisseId={p.caisse_id} numero={p.numero} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Poste de remboursement : à part de la grille des caisses de vente,
          car ses chiffres (argent qui SORT plutôt qu'entre) n'ont pas le
          même sens — voir theoriqueCaisseRemboursement. */}
      {edition && posteRemboursement && (
        <section className="mt-8">
          <h2 className="text-lg font-medium">Poste de remboursement</h2>
          <div className="mt-3 max-w-xs rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Remboursements</span>
              {posteRemboursement.caisse_id && Boolean(posteRemboursement.cloturee) && (
                <ReouvrirCaisseButton
                  caisseId={posteRemboursement.caisse_id}
                  numero={posteRemboursement.numero}
                />
              )}
            </div>
            <p
              className={`mt-1 text-xs font-medium uppercase tracking-wide ${
                posteRemboursement.cloturee
                  ? "text-zinc-400"
                  : posteRemboursement.connecte
                    ? "text-emerald-700"
                    : "text-zinc-400"
              }`}
            >
              {posteRemboursement.cloturee ? "Clôturé" : posteRemboursement.connecte ? "Ouvert" : "Fermé"}
            </p>
            {posteRemboursement.caisse_id ? (
              <>
                <p className="mt-2 text-sm text-zinc-600">
                  {remboursementsTotal ? Number(remboursementsTotal.nb) : 0} article(s) remboursé(s) —{" "}
                  {formaterMontant(remboursementsTotal ? Number(remboursementsTotal.total) : 0)}
                </p>
                {!posteRemboursement.cloturee && (
                  <div className="mt-2">
                    <VidageForm
                      caisseId={posteRemboursement.caisse_id}
                      nbArticlesVendus={Number(posteRemboursement.nb_articles_vendus)}
                    />
                  </div>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-zinc-400">Pas encore de caisse pour cette édition.</p>
            )}
          </div>
        </section>
      )}

      {/* Verrouillage du site public : 3 modes (voir siteTrocOuvert). Par
          défaut ("Automatique"), verrouillé sans édition active et
          déverrouillé avec — les deux modes manuels forcent l'un ou l'autre
          quelle que soit l'édition (démo sans édition, ou tests en
          conditions réelles avec édition sans exposer le site). */}
      {parametres && (
        <section className="mt-8">
          <h2 className="text-lg font-medium">Accès au site public</h2>
          <div className="mt-3 rounded-md border border-zinc-200 p-4">
            <VerrouillageSiteButton
              mode={parametres.mode_verrouillage}
              editionActive={Boolean(edition)}
              onToggle={basculerVerrouillageSite}
            />
            <div className="mt-4 border-t border-zinc-200 pt-4">
              <DateOuvertureEditor
                valeurInitiale={parametres.date_ouverture_troc}
                onSave={modifierDateOuverture}
              />
              <p className="mt-1 text-xs text-zinc-500">
                Affiche un compte à rebours sur l&apos;écran de verrouillage. Laissez vide pour ne rien
                afficher.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Rappelée dans l'email envoyé par l'accueil à la réception d'une
          liste (voir marquerControlee) — un seul réglage pour toute
          l'édition, pas par vendeur. */}
      {parametres && (
        <section className="mt-8">
          <h2 className="text-lg font-medium">Récupération des invendus</h2>
          <div className="mt-3 rounded-md border border-zinc-200 p-4">
            <DateOuvertureEditor
              label="Date de récupération"
              valeurInitiale={parametres.date_recuperation_invendus}
              onSave={modifierDateRecuperation}
            />
            <p className="mt-1 text-xs text-zinc-500">
              Rappelée aux vendeurs dans l&apos;email envoyé quand l&apos;accueil marque leur liste comme
              contrôlée. Laissez vide si elle n&apos;est pas encore fixée.
            </p>
          </div>
        </section>
      )}

      {/* Codes d'accès */}
      <section className="mt-8">
        <h2 className="text-lg font-medium">Codes d&apos;accès</h2>
        <div className="mt-3 space-y-2 rounded-md border border-zinc-200 p-4">
          {edition &&
            postes.map((p) => (
              <CodeEditor
                key={p.poste_id}
                label={p.type === "remboursement" ? "Remboursements" : `Caisse ${p.numero}`}
                valeurInitiale={p.code_acces}
                onSave={modifierCodeCaisse.bind(null, p.poste_id)}
              />
            ))}
          {parametres && (
            <CodeEditor label="Accueil" valeurInitiale={parametres.code_accueil} onSave={modifierCodeAccueil} />
          )}
          {parametres && (
            <CodeEditor label="Dashboard" valeurInitiale={parametres.code_dashboard} onSave={modifierCodeDashboard} />
          )}
          {!edition && (
            <p className="text-xs text-zinc-400">
              Les codes des caisses n&apos;apparaissent qu&apos;une fois une édition active.
            </p>
          )}
        </div>
      </section>

      {/* Sauvegarde : instantané complet à garder de côté en cas de pépin */}
      <section className="mt-8">
        <h2 className="text-lg font-medium">Sauvegarde</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Télécharge un instantané complet de la base (toutes les données, pas seulement l&apos;édition
          en cours), à faire régulièrement pendant la vente pour avoir un secours en cas de problème.
        </p>
        {parametres &&
          (() => {
            const { texte, ancienne } = texteDerniereSauvegarde(parametres.derniere_sauvegarde_le);
            const alerte = ancienne && edition?.phase === "caisse";
            return (
              <p className={`mt-2 text-sm ${alerte ? "font-medium text-amber-700" : "text-zinc-500"}`}>
                Dernière sauvegarde : {texte}
                {alerte && " — pensez à en refaire une pendant la vente."}
              </p>
            );
          })()}
        <div className="mt-3">
          <SauvegardeButton />
        </div>
      </section>

      {/* Import démo 2025 : indépendant de l'édition active, se fait une
          seule fois — bouton retiré dès que l'édition 2025 existe. */}
      {!edition2025 && (
        <section className="mt-8 rounded-md border border-blue-200 bg-blue-50/40 p-4">
          <h2 className="text-lg font-medium text-blue-900">Import démo — édition 2025</h2>
          <p className="mt-1 text-xs text-blue-800">
            Importe les données du cahier vendeur papier 2025 (156 vendeurs) comme édition terminée, pour
            tester les bilans et impressions sans attendre le prochain vrai troc.
          </p>
          <div className="mt-3">
            <Import2025Button />
          </div>
        </section>
      )}

      {/* Zone de test : à retirer avant le vrai troc */}
      {edition && (
        <section className="mt-8 rounded-md border border-red-200 bg-red-50/40 p-4">
          <h2 className="text-lg font-medium text-red-800">Zone de test</h2>
          <p className="mt-1 text-xs text-red-700">
            À utiliser uniquement pendant les essais — efface toutes les données de l&apos;édition active.
          </p>
          <div className="mt-3">
            <ResetTestDataButton />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-700">
            Codes de scan générés (vendeur-article-prix) :
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="text-xs">
              <thead>
                <tr>
                  <th className="pr-3 text-left font-medium text-zinc-500">Vendeur</th>
                  {PRIX_ARTICLES_TEST.map((_, i) => (
                    <th key={i} className="px-2 text-left font-medium text-zinc-500">
                      Art. {String(i + 1).padStart(2, "0")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 10 }, (_, vi) => vi + 1).map((numeroVendeur) => (
                  <tr key={numeroVendeur} className="border-t border-red-100">
                    <td className="pr-3 py-1 font-medium">#{numeroVendeur}</td>
                    {PRIX_ARTICLES_TEST.map((prix, ai) => (
                      <td key={ai} className="px-2 py-1 font-mono">
                        {numeroVendeur}-{String(ai + 1).padStart(2, "0")}-{prix}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
        </div>

        {/* Sidebar : demandes de connexion + caisses connectées */}
        <div className="space-y-6">
          {edition && demandes.length > 0 && (
            <section>
              <h2 className="text-lg font-medium">Demandes de connexion</h2>
              <ul className="mt-3 space-y-2">
                {demandes.map((p) => (
                  <li
                    key={p.poste_id}
                    className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3"
                  >
                    <p className="text-sm font-medium">
                      {p.type === "remboursement" ? "Remboursements" : `Caisse ${p.numero}`} veut se connecter
                    </p>
                    <div className="mt-2 flex gap-2">
                      <form action={validerConnexionCaisse.bind(null, p.poste_id)}>
                        <button
                          type="submit"
                          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
                        >
                          Valider
                        </button>
                      </form>
                      <form action={refuserConnexionCaisse.bind(null, p.poste_id)}>
                        <button
                          type="submit"
                          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:border-zinc-400"
                        >
                          Refuser
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {edition && connectees.length > 0 && (
            <section>
              <h2 className="text-lg font-medium">Caisses connectées</h2>
              <ul className="mt-3 space-y-2">
                {connectees.map((p) => (
                  <li key={p.poste_id} className="rounded-md border border-zinc-200 px-4 py-3">
                    <p className="text-sm font-medium">
                      {p.type === "remboursement" ? "Remboursements" : `Caisse ${p.numero}`}
                    </p>
                    <form action={deconnecterCaisse.bind(null, p.poste_id)}>
                      <button
                        type="submit"
                        className="mt-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:border-red-400 hover:text-red-600"
                      >
                        Déconnecter
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </main>
    </RefreshPauseProvider>
  );
}
