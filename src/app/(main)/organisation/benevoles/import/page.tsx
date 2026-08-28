import Link from "next/link";
import { requireOrganisationUser } from "@/lib/session";
import { mailConfigured } from "@/lib/mail";
import VolunteerImportForm from "@/components/VolunteerImportForm";

export default async function VolunteerImportPage() {
  await requireOrganisationUser();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/organisation/benevoles" className="text-sm text-brand-blue hover:underline">
          ← Retour à la gestion des bénévoles
        </Link>
        <h2 className="mt-2 text-lg font-medium text-stone-900">
          Import groupé depuis Excel (copié-collé)
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Sélectionnez et copiez les lignes de votre fichier Excel (colonnes
          PRÉNOM, NOM, MOBILE, E MAIL, NIVEAU, JOURS, FRÉQUENCE, dans cet
          ordre), puis collez-les ci-dessous. Une prévisualisation s&rsquo;affiche
          avant toute création ou modification de compte — rien n&rsquo;est
          enregistré tant que vous n&rsquo;avez pas cliqué sur « Confirmer
          l&rsquo;import ».
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-stone-500">
          <li>
            Un email déjà présent dans la base met à jour ce compte (nom,
            téléphone, poste) sans jamais rétrograder son rôle ; les
            disponibilités cochées s&rsquo;ajoutent aux existantes, elles ne les
            remplacent pas.
          </li>
          <li>
            NIVEAU 2/3/4 fixe le poste (Accueil/Retour/Sortie) et permet
            d&rsquo;importer les jours théoriques comme disponibilités. NIVEAU
            0, 1 (ou non reconnu) ne fixe aucun poste et n&rsquo;importe aucune
            disponibilité — la personne ne doit être sollicitée que pour de
            l&rsquo;animation, la ligne est simplement signalée pour vérification.
          </li>
          <li>La mention « Responsable » dans la colonne JOURS propose le rôle Responsable.</li>
          <li>La colonne FRÉQUENCE n&rsquo;est pas importée (aucun champ correspondant sur les fiches).</li>
        </ul>
      </div>

      <VolunteerImportForm mailIsConfigured={mailConfigured()} />
    </div>
  );
}
