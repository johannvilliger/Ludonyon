"use client";

// Redimensionne une image côté navigateur avant l'envoi, pour éviter les
// photos de plusieurs Mo (courant avec un appareil photo de téléphone) qui
// dépassent la limite de taille des Server Actions.
export async function resizeImageFile(
  file: File,
  maxDimension = 1200,
  quality = 0.85
): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;

    if (width > maxDimension || height > maxDimension) {
      if (width >= height) {
        height = Math.round((height / width) * maxDimension);
        width = maxDimension;
      } else {
        width = Math.round((width / height) * maxDimension);
        height = maxDimension;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob) return file;

    const name = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    // Formats non supportés par le navigateur (ex. certains HEIC) :
    // on retombe sur le fichier d'origine, la validation serveur
    // décidera si c'est acceptable.
    return file;
  }
}
