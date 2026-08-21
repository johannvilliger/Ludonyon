import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

// Hors public/ volontairement : contrairement aux photos, ces fichiers ne
// doivent jamais être atteignables par une simple URL statique, même par
// un compte authentifié sans le bon rôle (voir api/organisation/evenements/
// [id]/recording, qui vérifie le rôle avant de streamer le fichier).
const STORAGE_DIR = path.join(process.cwd(), "storage", "recordings");

const ALLOWED_TYPES: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
};

export const MAX_RECORDING_SIZE = 200 * 1024 * 1024; // 200 Mo

export function recordingMimeFromExt(ext: string): string {
  const entry = Object.entries(ALLOWED_TYPES).find(([, e]) => e === ext);
  return entry?.[0] ?? "application/octet-stream";
}

export async function saveRecording(eventId: string, file: File): Promise<string> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new Error("Format audio non supporté");
  }
  if (file.size > MAX_RECORDING_SIZE) {
    throw new Error("Enregistrement trop volumineux (200 Mo maximum)");
  }

  await mkdir(STORAGE_DIR, { recursive: true });
  const filename = `${eventId}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(STORAGE_DIR, filename), buffer);
  return filename;
}

export async function deleteRecording(filename: string | null): Promise<void> {
  if (!filename) return;
  try {
    await unlink(path.join(STORAGE_DIR, filename));
  } catch {
    // fichier déjà absent : rien à faire
  }
}

export function recordingFilePath(filename: string): string {
  return path.join(STORAGE_DIR, filename);
}
