import { updateMyPhoto, removeMyPhoto } from "@/lib/actions/profile";
import PhotoUploadField from "@/components/PhotoUploadField";

export default function PhotoForm({ hasPhoto }: { hasPhoto: boolean }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-white p-4">
      <PhotoUploadField action={updateMyPhoto} />
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
