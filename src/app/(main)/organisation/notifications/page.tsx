import { requireOrganisationUser } from "@/lib/session";
import { pushConfigured } from "@/lib/push";
import { sendManualNotification } from "@/lib/actions/organisation";

export default async function OrganisationNotificationsPage() {
  await requireOrganisationUser();

  return (
    <div>
      <h2 className="text-lg font-medium text-stone-900">
        Envoyer une notification
      </h2>
      <p className="mt-1 text-sm text-stone-500">
        Reçue par les personnes ayant activé les notifications sur leur
        appareil (voir Mon profil), et publiée dans les Annonces — visible
        uniquement par le public choisi ci-dessous.
      </p>

      {!pushConfigured() && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Notifications non configurées sur ce site (clés VAPID manquantes).
        </p>
      )}

      <form
        action={sendManualNotification}
        className="mt-4 max-w-md space-y-3 rounded-xl border border-stone-200 bg-white p-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">
            Titre
          </label>
          <input
            type="text"
            name="title"
            required
            maxLength={100}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">
            Message
          </label>
          <textarea
            name="body"
            required
            rows={3}
            maxLength={500}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">
            Destinataires
          </label>
          <select
            name="target"
            defaultValue="all"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          >
            <option value="all">Tous les bénévoles</option>
            <option value="organisation">
              Responsables et comité uniquement
            </option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg border-2 border-black bg-brand-yellow px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand-yellow-dark"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
