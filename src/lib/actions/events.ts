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
  revalidatePath(`/evenements/${eventId}`);
  revalidatePath("/");
}

export async function cancelEventSignup(eventId: string) {
  const user = await requireUser();

  await prisma.eventSignup.deleteMany({
    where: { eventId, userId: user.id },
  });

  revalidatePath("/evenements");
  revalidatePath(`/evenements/${eventId}`);
  revalidatePath("/");
}

export async function toggleWantsReminder(eventId: string) {
  const user = await requireUser();

  const signup = await prisma.eventSignup.findUnique({
    where: { eventId_userId: { eventId, userId: user.id } },
  });
  if (!signup) return;

  await prisma.eventSignup.update({
    where: { id: signup.id },
    data: { wantsReminder: !signup.wantsReminder },
  });

  revalidatePath("/evenements");
  revalidatePath(`/evenements/${eventId}`);
}

export async function toggleSeekingReplacement(eventId: string) {
  const user = await requireUser();

  const signup = await prisma.eventSignup.findUnique({
    where: { eventId_userId: { eventId, userId: user.id } },
  });
  if (!signup) return;

  await prisma.eventSignup.update({
    where: { id: signup.id },
    data: { seekingReplacement: !signup.seekingReplacement },
  });

  revalidatePath("/evenements");
  revalidatePath(`/evenements/${eventId}`);
  revalidatePath("/");
}

export async function fulfillReplacement(formData: FormData) {
  const user = await requireUser();
  const eventId = String(formData.get("eventId"));
  const replacedSignupId = String(formData.get("signupId"));

  const target = await prisma.eventSignup.findUnique({
    where: { id: replacedSignupId },
  });
  if (!target || target.eventId !== eventId || !target.seekingReplacement) {
    throw new Error("Ce créneau n'est plus à remplacer");
  }
  if (target.userId === user.id) {
    throw new Error("Vous ne pouvez pas remplacer votre propre créneau");
  }

  await prisma.$transaction([
    prisma.eventSignup.delete({ where: { id: target.id } }),
    prisma.eventSignup.upsert({
      where: { eventId_userId: { eventId, userId: user.id } },
      update: { seekingReplacement: false },
      create: { eventId, userId: user.id },
    }),
  ]);

  revalidatePath("/evenements");
  revalidatePath("/");
}
