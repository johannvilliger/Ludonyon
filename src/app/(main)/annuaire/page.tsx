import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import Avatar from "@/components/Avatar";

export default async function AnnuairePage() {
  await requireUser();

  const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      skills: true,
      photoPath: true,
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">
        Annuaire des bénévoles
      </h1>
      <p className="mt-1 text-stone-500">
        {users.length} membre{users.length > 1 ? "s" : ""} de l’équipe.
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {users.map((u) => (
          <li
            key={u.id}
            className="rounded-xl border border-stone-200 bg-white p-4"
          >
            <div className="flex items-start gap-3">
              <Avatar name={u.name} photoPath={u.photoPath} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-stone-900">{u.name}</p>
                  <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                    {ROLE_LABELS[u.role as Role] ?? u.role}
                  </span>
                </div>
                {u.email && (
                  <p className="mt-1 text-sm text-stone-600">
                    <a href={`mailto:${u.email}`} className="hover:underline">
                      {u.email}
                    </a>
                  </p>
                )}
                {u.phone && <p className="text-sm text-stone-600">{u.phone}</p>}
                {u.skills && (
                  <p className="mt-2 text-sm text-stone-500">{u.skills}</p>
                )}
                <a
                  href={`/api/annuaire/${u.id}/vcard`}
                  className="mt-2 inline-block text-xs text-brand-blue hover:underline"
                >
                  Ajouter aux contacts
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
