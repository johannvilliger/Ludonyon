"use client";

import { useRef } from "react";

export default function PlanningAssignSelect({
  action,
  date,
  site,
  periode,
  options,
  placeholder = "+ ajouter…",
  fonction,
}: {
  action: (formData: FormData) => Promise<void>;
  date: string;
  site: string;
  periode: string;
  options: { id: string; name: string }[];
  placeholder?: string;
  // Renseigné quand cette liste correspond à un siège précis de la
  // structure (Responsable/Retour/Accueil/Anim. — voir SEAT_REQUIREMENTS
  // dans autoSchedule.ts) : affiché ensuite à côté du nom sur le
  // calendrier, à la place du poste générique du profil.
  fonction?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action} className="mt-1.5">
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="site" value={site} />
      <input type="hidden" name="periode" value={periode} />
      {fonction && <input type="hidden" name="fonction" value={fonction} />}
      <select
        name="userId"
        defaultValue=""
        onChange={() => formRef.current?.requestSubmit()}
        className="w-full rounded border border-stone-200 bg-white px-1 py-0.5 text-xs text-stone-500"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </form>
  );
}
