import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import heicConvert from "heic-convert";

export { photoUrl } from "./photoUrl";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "photos");

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Format par défaut des photos prises avec un iPhone. La plupart des
// navigateurs (Android en particulier, et certains contextes iOS) ne
// savent pas décoder le HEIC pour le convertir côté client (voir
// resizeImageFile, qui retombe alors sur le fichier HEIC d'origine) : on
// le convertit ici en JPEG, plutôt que de rejeter l'envoi.
const HEIC_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

export const MAX_PHOTO_SIZE = 4 * 1024 * 1024; // 4 Mo

function looksLikeHeic(file: File): boolean {
  if (HEIC_TYPES.has(file.type)) return true;
  // Certains navigateurs mobiles ne renseignent pas le type MIME pour le
  // HEIC (file.type vide) : on se rabat sur l'extension du fichier.
  return /\.hei[cf]$/i.test(file.name);
}

export async function savePhoto(userId: string, file: File): Promise<string> {
  if (file.size > MAX_PHOTO_SIZE) {
    throw new Error("Image trop volumineuse (4 Mo maximum)");
  }

  let ext = ALLOWED_TYPES[file.type];
  let buffer = Buffer.from(await file.arrayBuffer());

  if (!ext && looksLikeHeic(file)) {
    try {
      const converted = await heicConvert({ buffer, format: "JPEG", quality: 0.9 });
      buffer = Buffer.from(converted);
      ext = "jpg";
    } catch {
      throw new Error(
        "Impossible de convertir cette photo HEIC — réessayez avec un autre format"
      );
    }
  }

  if (!ext) {
    throw new Error("Format d'image non supporté (jpg, png, webp ou HEIC)");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${userId}-${Date.now()}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return filename;
}

export async function deletePhoto(filename: string | null): Promise<void> {
  if (!filename) return;
  try {
    await unlink(path.join(UPLOAD_DIR, filename));
  } catch {
    // fichier déjà absent : rien à faire
  }
}
