"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireOrganisationUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";

// ---------- Annonces ----------

const announcementSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis").max(200),
  body: z.string().trim().min(1, "Le contenu est requis").max(5000),
});

export async function createAnnouncement(formData: FormData) {
  const user = await requireOrganisationUser();

  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Champs invalides");
  }

  await prisma.announcement.create({
    data: { ...parsed.data, authorId: user.id },
  });

  revalidatePath("/annonces");
  revalidatePath("/organisation/annonces");
  revalidatePath("/");
}

export async function deleteAnnouncement(formData: FormData) {
  await requireOrganisationUser();
  const id = String(formData.get("id"));

  await prisma.announcement.delete({ where: { id } });

  revalidatePath("/annonces");
  revalidatePath("/organisation/annonces");
  revalidatePath("/");
}

// ---------- Événements ----------

const eventSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis").max(200),
  description: z.string().trim().max(5000).optional(),
  location: z.string().trim().max(200).optional(),
  startsAt: z.string().min(1, "La date de début est requise"),
  endsAt: z.string().optional(),
});

export async function createEvent(formData: FormData) {
  const user = await requireOrganisationUser();

  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    location: formData.get("location") || undefined,
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Champs invalides");
  }

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null;
  if (Number.isNaN(startsAt.getTime())) {
    throw new Error("Date de début invalide");
  }
  if (endsAt && Number.isNaN(endsAt.getTime())) {
    throw new Error("Date de fin invalide");
  }

  await prisma.event.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      location: parsed.data.location ?? null,
      startsAt,
      endsAt,
      createdById: user.id,
    },
  });

  revalidatePath("/evenements");
  revalidatePath("/organisation/evenements");
  revalidatePath("/");
}

export async function deleteEvent(formData: FormData) {
  await requireOrganisationUser();
  const id = String(formData.get("id"));

  await prisma.event.delete({ where: { id } });

  revalidatePath("/evenements");
  revalidatePath("/organisation/evenements");
  revalidatePath("/");
}

// ---------- Bénévoles ----------

const volunteerSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(200),
  email: z.string().trim().toLowerCase().email("Email invalide"),
  phone: z.string().trim().max(50).optional(),
  skills: z.string().trim().max(1000).optional(),
  role: z.enum(ROLES),
  password: z.string().min(8, "8 caractères minimum"),
});

export async function createVolunteer(formData: FormData) {
  await requireOrganisationUser();

  const parsed = volunteerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    skills: formData.get("skills") || undefined,
    role: formData.get("role"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Champs invalides");
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    throw new Error("Un compte existe déjà avec cet email");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
      skills: parsed.data.skills ?? null,
      role: parsed.data.role,
      passwordHash,
    },
  });

  revalidatePath("/annuaire");
  revalidatePath("/organisation/benevoles");
}

const roleUpdateSchema = z.object({
  id: z.string().min(1),
  role: z.enum(ROLES),
});

export async function updateVolunteerRole(formData: FormData) {
  const currentUser = await requireOrganisationUser();

  const parsed = roleUpdateSchema.safeParse({
    id: formData.get("id"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    throw new Error("Champs invalides");
  }

  if (parsed.data.id === currentUser.id) {
    throw new Error("Vous ne pouvez pas modifier votre propre rôle");
  }

  await prisma.user.update({
    where: { id: parsed.data.id },
    data: { role: parsed.data.role },
  });

  revalidatePath("/annuaire");
  revalidatePath("/organisation/benevoles");
}

export async function deleteVolunteer(formData: FormData) {
  const currentUser = await requireOrganisationUser();
  const id = String(formData.get("id"));

  if (id === currentUser.id) {
    throw new Error("Vous ne pouvez pas supprimer votre propre compte");
  }

  await prisma.user.delete({ where: { id } });

  revalidatePath("/annuaire");
  revalidatePath("/organisation/benevoles");
}

const resetPasswordSchema = z.object({
  id: z.string().min(1),
  password: z.string().min(8, "8 caractères minimum"),
});

export async function resetVolunteerPassword(formData: FormData) {
  await requireOrganisationUser();

  const parsed = resetPasswordSchema.safeParse({
    id: formData.get("id"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Champs invalides");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({
    where: { id: parsed.data.id },
    data: { passwordHash },
  });

  revalidatePath("/organisation/benevoles");
}
