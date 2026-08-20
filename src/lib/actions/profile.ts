"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { savePhoto, deletePhoto } from "@/lib/photoStorage";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Mot de passe actuel requis"),
    newPassword: z.string().min(8, "8 caractères minimum"),
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type ChangePasswordState = { error?: string; success?: boolean };

export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const authUser = await requireUser();

  const parsed = schema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  const dbUser = await prisma.user.findUniqueOrThrow({
    where: { id: authUser.id },
  });

  const valid = await bcrypt.compare(
    parsed.data.currentPassword,
    dbUser.passwordHash
  );
  if (!valid) {
    return { error: "Mot de passe actuel incorrect" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: authUser.id },
    data: { passwordHash },
  });

  return { success: true };
}

export async function updateMyPhoto(formData: FormData) {
  const authUser = await requireUser();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Aucune image sélectionnée");
  }

  const current = await prisma.user.findUniqueOrThrow({
    where: { id: authUser.id },
    select: { photoPath: true },
  });

  const filename = await savePhoto(authUser.id, file);
  await prisma.user.update({
    where: { id: authUser.id },
    data: { photoPath: filename },
  });
  await deletePhoto(current.photoPath);

  revalidatePath("/profil");
  revalidatePath("/annuaire");
}

const vacationSchema = z
  .object({
    startDate: z.string().min(1, "Date de début requise"),
    endDate: z.string().min(1, "Date de fin requise"),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "La date de fin doit être après la date de début",
    path: ["endDate"],
  });

export async function addVacation(formData: FormData) {
  const authUser = await requireUser();

  const parsed = vacationSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dates invalides");
  }

  await prisma.vacation.create({
    data: {
      userId: authUser.id,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
    },
  });

  revalidatePath("/profil");
  revalidatePath("/organisation/benevoles");
}

export async function deleteVacation(formData: FormData) {
  const authUser = await requireUser();
  const id = String(formData.get("id"));

  await prisma.vacation.deleteMany({
    where: { id, userId: authUser.id },
  });

  revalidatePath("/profil");
  revalidatePath("/organisation/benevoles");
}

export async function toggleOpeningReminders(formData: FormData) {
  const authUser = await requireUser();
  const wantsOpeningReminders = formData.get("wantsOpeningReminders") === "on";

  await prisma.user.update({
    where: { id: authUser.id },
    data: { wantsOpeningReminders },
  });

  revalidatePath("/profil");
}

export async function removeMyPhoto() {
  const authUser = await requireUser();
  const current = await prisma.user.findUniqueOrThrow({
    where: { id: authUser.id },
    select: { photoPath: true },
  });

  await prisma.user.update({
    where: { id: authUser.id },
    data: { photoPath: null },
  });
  await deletePhoto(current.photoPath);

  revalidatePath("/profil");
  revalidatePath("/annuaire");
}
