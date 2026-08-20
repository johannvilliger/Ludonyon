import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function OrganisationOverviewPage() {
  const [volunteerCount, upcomingEventCount, announcementCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.event.count({ where: { startsAt: { gte: new Date() } } }),
      prisma.announcement.count(),
    ]);

  const cards = [
    {
      href: "/organisation/benevoles",
      label: "Bénévoles",
      value: volunteerCount,
    },
    {
      href: "/organisation/evenements",
      label: "Événements à venir",
      value: upcomingEventCount,
    },
    {
      href: "/organisation/annonces",
      label: "Annonces publiées",
      value: announcementCount,
    },
  ];

  return (
    <div>
      <p className="text-stone-500">
        Gérez les événements, les annonces et les comptes des bénévoles.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-xl border border-stone-200 bg-white p-4 transition hover:border-amber-300 hover:shadow-sm"
          >
            <p className="text-3xl font-semibold text-stone-900">
              {card.value}
            </p>
            <p className="mt-1 text-sm text-stone-500">{card.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
