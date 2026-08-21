"use client";

import { useActionState } from "react";
import {
  importPlanningExcel,
  type ImportPlanningExcelState,
} from "@/lib/actions/planningExcel";

const initialState: ImportPlanningExcelState = {};

export default function PlanningExcelImportForm() {
  const [state, formAction, isPending] = useActionState(
    importPlanningExcel,
    initialState
  );

  return (
    <form action={formAction} className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="file"
          accept=".xlsx"
          required
          className="text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-2 file:border-black file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-stone-100"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border-2 border-black bg-brand-yellow px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand-yellow-dark disabled:opacity-60"
        >
          {isPending ? "Import en cours…" : "Importer le fichier rempli"}
        </button>
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.success}
        </p>
      )}
    </form>
  );
}
