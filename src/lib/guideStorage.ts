import { mkdir, stat, unlink, writeFile } from "fs/promises";
import path from "path";

// Un unique mode d'emploi PDF, géré par le comité, joint automatiquement
// aux emails de bienvenue. Stocké hors dépôt git comme les photos de
// profil (voir public/uploads dans .gitignore).
const GUIDE_DIR = path.join(process.cwd(), "public", "uploads", "guide");
const GUIDE_FILENAME = "mode-emploi.pdf";
const GUIDE_PATH = path.join(GUIDE_DIR, GUIDE_FILENAME);

export const MAX_GUIDE_SIZE = 15 * 1024 * 1024; // 15 Mo

export async function saveGuide(file: File): Promise<void> {
  if (file.type !== "application/pdf") {
    throw new Error("Le mode d'emploi doit être un fichier PDF");
  }
  if (file.size > MAX_GUIDE_SIZE) {
    throw new Error("Fichier trop volumineux (15 Mo maximum)");
  }

  await mkdir(GUIDE_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(GUIDE_PATH, buffer);
}

export async function deleteGuide(): Promise<void> {
  try {
    await unlink(GUIDE_PATH);
  } catch {
    // déjà absent : rien à faire
  }
}

export async function guideExists(): Promise<boolean> {
  try {
    await stat(GUIDE_PATH);
    return true;
  } catch {
    return false;
  }
}

export function guideAttachmentPath(): string {
  return GUIDE_PATH;
}
