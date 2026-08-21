import { requireOrganisationUser } from "@/lib/session";
import { mailConfigured } from "@/lib/mail";
import { guideExists } from "@/lib/guideStorage";
import { uploadGuide, removeGuide } from "@/lib/actions/organisation";

export default async function OrganisationParametresPage() {
  await requireOrganisationUser();
  const hasGuide = await guideExists();

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-medium text-stone-900">
          Email de bienvenue
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          À la création d&rsquo;un compte bénévole, un email avec
          l&rsquo;adresse du site, l&rsquo;identifiant et le mot de passe
          provisoire est envoyé automatiquement à la personne.
        </p>
        {mailConfigured() ? (
          <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            Serveur d&rsquo;envoi configuré : les emails partent
            automatiquement.
          </p>
        ) : (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Aucun serveur d&rsquo;envoi configuré (variables SMTP_* absentes
            du <code>.env</code>) : communiquez les identifiants
            manuellement pour l&rsquo;instant.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium text-stone-900">
          Mode d&rsquo;emploi
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          PDF joint automatiquement à l&rsquo;email de bienvenue, s&rsquo;il
          est présent.
        </p>
        <div className="mt-3 rounded-xl border border-stone-200 bg-white p-4">
          {hasGuide ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-stone-700">
                Un mode d&rsquo;emploi est actuellement en ligne.
              </p>
              <form action={removeGuide}>
                <button
                  type="submit"
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                >
                  Supprimer
                </button>
              </form>
            </div>
          ) : (
            <p className="text-sm text-stone-400">
              Aucun mode d&rsquo;emploi en ligne pour l&rsquo;instant.
            </p>
          )}
          <form
            action={uploadGuide}
            className="mt-3 flex flex-wrap items-center gap-2"
          >
            <input
              type="file"
              name="guide"
              accept="application/pdf"
              required
              className="text-sm"
            />
            <button
              type="submit"
              className="rounded-lg border-2 border-black bg-brand-yellow px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-brand-yellow-dark"
            >
              {hasGuide ? "Remplacer" : "Mettre en ligne"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
