import { requireOrganisationUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { loadPlanningWeeksAndShifts } from "@/lib/planningData";
import PlanningMonthNav from "@/components/PlanningMonthNav";
import PlanningTable from "@/components/PlanningTable";

export default async function OrganisationPlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const currentUser = await requireOrganisationUser();

  const { y, m } = await searchParams;
  const now = new Date();
  const year = Number(y) || now.getFullYear();
  const month = Number(m) || now.getMonth() + 1;

  const [{ weeks, shiftsByKey }, activeUsers] = await Promise.all([
    loadPlanningWeeksAndShifts(year, month),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-stone-900">
          Planning des ouvertures
        </h2>
        <PlanningMonthNav basePath="/organisation/planning" year={year} month={month} />
      </div>
      <p className="mt-1 text-sm text-stone-500">
        Choisissez un·e bénévole dans la liste déroulante de chaque case
        pour l&rsquo;assigner ; cliquez sur le × pour le retirer.
      </p>
      <p className="mt-2 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-400">
        Import depuis un fichier Excel : à venir, une fois le format du
        fichier standardisé.
      </p>

      <div className="mt-4">
        <PlanningTable
          weeks={weeks}
          shiftsByKey={shiftsByKey}
          editable
          activeUsers={activeUsers}
          currentUserId={currentUser.id}
        />
      </div>
    </div>
  );
}
