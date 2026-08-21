"use client";

import { useRef, useState, useTransition } from "react";
import { resizeImageFile } from "@/lib/resizeImage";

export default function PhotoUploadField({
  action,
  extraFields,
  buttonClassName,
}: {
  action: (formData: FormData) => Promise<void>;
  extraFields?: Record<string, string>;
  buttonClassName?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setError(null);
    startTransition(async () => {
      try {
        const resized = await resizeImageFile(file);
        const formData = new FormData();
        formData.set("photo", resized);
        for (const [key, value] of Object.entries(extraFields ?? {})) {
          formData.set(key, value);
        }
        await action(formData);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch {
        setError("Échec de l'envoi de la photo");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        required
        disabled={isPending}
        className="text-sm"
      />
      <button
        type="submit"
        disabled={isPending}
        className={
          buttonClassName ??
          "rounded-lg border-2 border-black bg-brand-yellow px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-brand-yellow-dark disabled:opacity-60"
        }
      >
        {isPending ? "Envoi…" : "Enregistrer"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
