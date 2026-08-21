import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

export { photoUrl } from "./photoUrl";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "photos");

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_PHOTO_SIZE = 4 * 1024 * 1024; // 4 Mo

export async function savePhoto(userId: string, file: File): Promise<string> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new Error("Format d'image non supporté (jpg, png ou webp uniquement)");
  }
  if (file.size > MAX_PHOTO_SIZE) {
    throw new Error("Image trop volumineuse (4 Mo maximum)");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${userId}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
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
