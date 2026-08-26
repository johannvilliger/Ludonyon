import Link from "next/link";
import { requireOrganisationUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { pushConfigured } from "@/lib/push";
import { sendManualNotification } from "@/lib/actions/organisation";
import { formatDateTime } from "@/lib/format";

const CATEGORY_LABELS: Record<string, string> = {
  MANUAL: "Manuelle",
  EVENT_REMINDER: "Rappel événement",
  OPENING_REMINDER: "Rappel ouverture",
  REPLACEMENT_REQUEST: "Recherche de remplaçant",
  REPLACEMENT_PROBLEM: "Alerte créneau à risque",
  TASK_REMINDER: "Rappel tâche",
};

export default async function OrganisationNotificationsPage() {
  await requireOrganisationUser();

  const history = await prisma.pushNotificationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const groups = await prisma.group.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h2 className="text-lg font-medium text-stone-900">
        Envoyer une notification
      </h2>
      <p className="mt-1 text-sm text-stone-500">
        Reçue par les personnes ayant activé les notifications sur leur
        appareil (voir Mon profil). Un envoi à « Tous les bénévoles » ou
        « Responsables et comité » est aussi publié dans les Annonces ; un
        envoi à un groupe reste une notification push uniquement.{" "}
        <Link href="/organisation/groupes" className="text-brand-blue hover:underline">
          Gérer les groupes
        </Link>
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
            {groups.length > 0 && (
              <optgroup label="Groupes">
                {groups.map((g) => (
                  <option key={g.id} value={`group:${g.id}`}>
                    {g.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg border-2 border-black bg-brand-yellow px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand-yellow-dark"
        >
          Envoyer
        </button>
      </form>

      <h2 className="mt-8 text-lg font-medium text-stone-900">Historique</h2>
      {history.length === 0 ? (
        <p className="mt-2 text-sm text-stone-400">
          Aucune notification envoyée pour l&rsquo;instant.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {history.map((entry) => (
            <li
              key={entry.id}
              className="rounded-xl border border-stone-200 bg-white p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-stone-900">{entry.title}</p>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                  {CATEGORY_LABELS[entry.category] ?? entry.category}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-stone-600">
                {entry.body}
              </p>
              <p className="mt-1 text-xs text-stone-400">
                {formatDateTime(entry.createdAt)} · {entry.recipients} destinataire
                {entry.recipients > 1 ? "s" : ""}
              </p>
              {entry.recipientNames && (
                <p className="mt-1 text-xs text-stone-400">
                  {entry.recipientNames}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
