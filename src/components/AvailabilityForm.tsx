import { getAvailabilityOptions } from "@/lib/planning";

export default function AvailabilityForm({
  action,
  selectedKeys,
  extraFields,
}: {
  action: (formData: FormData) => Promise<void>;
  selectedKeys: string[];
  extraFields?: Record<string, string>;
}) {
  const options = getAvailabilityOptions();
  const selected = new Set(selectedKeys);

  return (
    // Le formulaire est réaffiché avec les mêmes cases cochées après un
    // enregistrement réussi (React réinitialise les champs non contrôlés
    // à leur valeur de montage, pas à la nouvelle defaultChecked) — la clé
    // force un remontage avec les valeurs à jour dès que selectedKeys
    // change, y compris juste après ce même formulaire.
    <form key={[...selected].sort().join(",")} action={action} className="space-y-3">
      {Object.entries(extraFields ?? {}).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((opt) => (
          <label
            key={opt.slotKey}
            className="flex items-center gap-2 text-sm text-stone-700"
          >
            <input
              type="checkbox"
              name="slots"
              value={opt.slotKey}
              defaultChecked={selected.has(opt.slotKey)}
              className="h-4 w-4 rounded border-stone-300 text-brand-blue focus:ring-brand-blue"
            />
            {opt.label}
            <span className="text-xs text-stone-400">{opt.hours}</span>
          </label>
        ))}
      </div>
      <button
        type="submit"
        className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100"
      >
        Enregistrer
      </button>
    </form>
  );
}
