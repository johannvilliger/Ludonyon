import { NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";
import { requireOrganisationUser } from "@/lib/session";
import { canAccessEventAudience } from "@/lib/roles";
import { recordingFilePath, recordingMimeFromExt } from "@/lib/recordingStorage";

// Streame l'enregistrement d'une séance, avec support des requêtes Range
// (nécessaire pour la lecture audio sur Safari/iOS notamment). L'accès est
// vérifié par rôle à chaque requête, comme la page de gestion associée —
// ce fichier n'est jamais servi comme un simple asset statique.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOrganisationUser();
  const { id } = await params;

  const event = await prisma.event.findUnique({ where: { id } });
  if (
    !event ||
    !event.recordingPath ||
    !canAccessEventAudience(event.audience, user.role)
  ) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const filePath = recordingFilePath(event.recordingPath);
  const ext = event.recordingPath.split(".").pop() ?? "";
  const mimeType = recordingMimeFromExt(ext);

  let stats;
  try {
    stats = await stat(filePath);
  } catch {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }

  const range = request.headers.get("range");
  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range);
    const start = match ? Number(match[1]) : 0;
    const end = match?.[2] ? Number(match[2]) : stats.size - 1;

    const stream = createReadStream(filePath, { start, end });
    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${stats.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(end - start + 1),
        "Content-Type": mimeType,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const stream = createReadStream(filePath);
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Length": String(stats.size),
      "Content-Type": mimeType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
    },
  });
}
