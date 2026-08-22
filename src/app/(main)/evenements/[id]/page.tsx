import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatEventDate } from "@/lib/format";

export default async function EvenementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      signups: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Les séances comité ne sont jamais consultables ici, y compris par
  // accès direct à l'URL — voir /organisation/evenements pour le comité.
  if (!event || !event.active || event.audience !== "ALL") {
    notFound();
  }

  return (
    <div>
      <Link
        href="/evenements?filtre=passes"
        className="text-sm text-stone-500 hover:underline"
      >
        ← Tous les événements
      </Link>

      <h1 className="mt-2 text-2xl font-semibold text-stone-900">
        {event.title}
      </h1>
      <p className="mt-1 text-stone-600">
        {formatEventDate(event.startsAt, event.endsAt)}
        {event.location ? ` · ${event.location}` : ""}
      </p>
      {event.description && (
        <p className="mt-4 whitespace-pre-wrap text-stone-700">
          {event.description}
        </p>
      )}

      {event.signups.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-stone-700">
            Inscrit·e·s
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            {event.signups.map((s) => s.user.name).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
