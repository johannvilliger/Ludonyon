import Link from "next/link";
import { addMonths, formatMonthLabel } from "@/lib/planning";

export default function PlanningMonthNav({
  basePath,
  year,
  month,
}: {
  basePath: string;
  year: number;
  month: number;
}) {
  const prev = addMonths(year, month, -1);
  const next = addMonths(year, month, 1);

  return (
    <div className="flex items-center gap-1 text-sm sm:gap-2">
      <Link
        href={`${basePath}?y=${prev.year}&m=${prev.month}`}
        className="rounded-lg border border-stone-300 px-2 py-1.5 text-stone-600 hover:bg-stone-100 sm:px-3"
      >
        ← <span className="hidden sm:inline">Précédent</span>
      </Link>
      <span className="min-w-24 text-center font-medium text-stone-800 sm:min-w-36">
        {formatMonthLabel(year, month)}
      </span>
      <Link
        href={`${basePath}?y=${next.year}&m=${next.month}`}
        className="rounded-lg border border-stone-300 px-2 py-1.5 text-stone-600 hover:bg-stone-100 sm:px-3"
      >
        <span className="hidden sm:inline">Suivant</span> →
      </Link>
    </div>
  );
}
