import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import heicConvert from "heic-convert";

export { photoUrl } from "./photoUrl";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "photos");

export const MAX_PHOTO_SIZE = 4 * 1024 * 1024; // 4 Mo

const HEIC_BRANDS = new Set([
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "hevm",
  "hevs",
  "mif1",
  "msf1",
]);

// Détecte le format réel à partir des octets du fichier plutôt que du
// type MIME annoncé par le navigateur (file.type) : ce dernier n'est pas
// fiable sur mobile — beaucoup de navigateurs Android renvoient un type
// vide ou générique pour une photo prise via l'appareil photo, ce qui
// faisait rejeter l'envoi à tort même pour un JPEG tout à fait normal.
function detectImageFormat(buffer: Buffer): "jpg" | "png" | "webp" | "heic" | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
    if (HEIC_BRANDS.has(buffer.toString("ascii", 8, 12))) return "heic";
  }
  return null;
}

export async function savePhoto(userId: string, file: File): Promise<string> {
  if (file.size > MAX_PHOTO_SIZE) {
    throw new Error("Image trop volumineuse (4 Mo maximum)");
  }

  let buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectImageFormat(buffer);

  let ext: string | null = null;
  if (detected === "jpg" || detected === "png" || detected === "webp") {
    ext = detected;
  } else if (detected === "heic") {
    // Format par défaut des photos iPhone, aussi utilisé par certains
    // Android — converti en JPEG plutôt que rejeté.
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
