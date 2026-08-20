"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function signUpForEvent(eventId: string) {
  const user = await requireUser();

  await prisma.eventSignup.upsert({
    where: { eventId_userId: { eventId, userId: user.id } },
    update: {},
    create: { eventId, userId: user.id },
  });

  revalidatePath("/evenements");
  revalidatePath("/");
}

export async function cancelEventSignup(eventId: string) {
  const user = await requireUser();

  await prisma.eventSignup.deleteMany({
    where: { eventId, userId: user.id },
  });

  revalidatePath("/evenements");
  revalidatePath("/");
}
