import "server-only";
import type { NextRequest } from "next/server";
import { queryOne } from "./db";

// Auth machine-à-machine pour /api/etiquettes (print-agent) : un secret
// long comparé au header X-Code-Impression, pas une session/cookie comme
// le reste du site — l'appelant est un programme Windows, jamais un
// navigateur. Refuse tout tant que le secret n'a pas été généré depuis le
// dashboard (parametres_gestion.code_impression est NULL par défaut).
export async function requeteAutorisee(request: NextRequest): Promise<boolean> {
  const fourni = request.headers.get("x-code-impression");
  if (!fourni) return false;

  const parametres = await queryOne<{ code_impression: string | null }>(
    "SELECT code_impression FROM parametres_gestion WHERE id = 1",
  );
  if (!parametres?.code_impression) return false;

  return fourni === parametres.code_impression;
}
