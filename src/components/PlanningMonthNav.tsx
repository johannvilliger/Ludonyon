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
    <div className="flex items-center gap-2 text-sm">
      <Link
        href={`${basePath}?y=${prev.year}&m=${prev.month}`}
        className="rounded-lg border border-stone-300 px-3 py-1.5 text-stone-600 hover:bg-stone-100"
      >
        ← Précédent
      </Link>
      <span className="min-w-36 text-center font-medium text-stone-800">
        {formatMonthLabel(year, month)}
      </span>
      <Link
        href={`${basePath}?y=${next.year}&m=${next.month}`}
        className="rounded-lg border border-stone-300 px-3 py-1.5 text-stone-600 hover:bg-stone-100"
      >
        Suivant →
      </Link>
    </div>
  );
}
