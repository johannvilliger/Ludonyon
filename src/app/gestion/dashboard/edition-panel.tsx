"use client";

import { useState, type ReactNode } from "react";
import { useAutoRefreshPause } from "./refresh-pause-context";

export function EditionPanel({ resume, children }: { resume: string; children: ReactNode }) {
  const [ouvert, setOuvert] = useState(false);
  useAutoRefreshPause(ouvert);

  return (
    <div className="rounded-md border border-zinc-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">{resume}</p>
        <button
          type="button"
          onClick={() => setOuvert((v) => !v)}
          className="shrink-0 rounded-md border border-zinc-300 px-3 py-1 text-xs hover:border-zinc-400"
        >
          {ouvert ? "Fermer" : "Modifier"}
        </button>
      </div>
      {ouvert && <div className="mt-3">{children}</div>}
    </div>
  );
}
