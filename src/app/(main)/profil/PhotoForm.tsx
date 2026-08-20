import { updateMyPhoto, removeMyPhoto } from "@/lib/actions/profile";

export default function PhotoForm({ hasPhoto }: { hasPhoto: boolean }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-white p-4">
      <form action={updateMyPhoto} className="flex items-center gap-2">
        <input
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
          required
          className="text-sm"
        />
        <button
          type="submit"
          className="rounded-lg border-2 border-black bg-brand-yellow px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-brand-yellow-dark"
        >
          Enregistrer
        </button>
      </form>
      {hasPhoto && (
        <form action={removeMyPhoto}>
          <button
            type="submit"
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
          >
            Supprimer ma photo
          </button>
        </form>
      )}
    </div>
  );
}
