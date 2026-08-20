import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { buildVCard } from "@/lib/vcard";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireUser();
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { name: true, email: true, phone: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Bénévole introuvable" }, { status: 404 });
  }

  const vcard = buildVCard(user);
  const filename = `${user.name.replace(/[^a-zA-Z0-9]+/g, "-")}.vcf`;

  return new NextResponse(vcard, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
