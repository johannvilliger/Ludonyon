"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireOrganisationUser, requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ROLES, isOrganisationRole, canAccessEventAudience } from "@/lib/roles";
import { savePhoto, deletePhoto } from "@/lib/photoStorage";
import { sendPushToUsers } from "@/lib/push";
import { mailConfigured, sendMail } from "@/lib/mail";
import { guideAttachmentPath, guideExists, saveGuide, deleteGuide } from "@/lib/guideStorage";
import { getAvailabilityOptions } from "@/lib/planning";
import { isValidPoste } from "@/lib/postes";
import { isValidClothingSize, isValidClothingCut } from "@/lib/clothing";
import { saveRecording, deleteRecording } from "@/lib/recordingStorage";

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
  agenda: z.string().trim().max(5000).optional(),
  location: z.string().trim().max(200).optional(),
  startsAt: z.string().min(1, "La date de début est requise"),
  endsAt: z.string().optional(),
  paid: z.coerce.boolean().optional(),
  committeeOnly: z.coerce.boolean().optional(),
});

export async function createEvent(formData: FormData) {
  const user = await requireOrganisationUser();

  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    agenda: formData.get("agenda") || undefined,
    location: formData.get("location") || undefined,
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt") || undefined,
    paid: formData.get("paid") === "on" ? true : undefined,
    committeeOnly: formData.get("committeeOnly") === "on" ? true : undefined,
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

  // Seul le comité peut créer une séance réservée au comité, même si le
  // champ était présent dans la requête (défense en profondeur : la case
  // n'est de toute façon affichée qu'aux membres du comité).
  const committeeOnly = parsed.data.committeeOnly && user.role === "COMITE";

  await prisma.event.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      agenda: parsed.data.agenda ?? null,
      location: parsed.data.location ?? null,
      startsAt,
      endsAt,
      paid: parsed.data.paid ?? false,
      audience: committeeOnly ? "COMITE" : "ALL",
      createdById: user.id,
    },
  });

  revalidatePath("/evenements");
  revalidatePath("/organisation/evenements");
  revalidatePath("/");
}

// L'ordre du jour a son propre formulaire (updateEventAgenda) : on l'exclut
// ici pour ne pas l'écraser à null si ce champ n'est pas présent dans le
// formulaire d'édition générale.
const eventUpdateSchema = eventSchema.omit({ committeeOnly: true, agenda: true });

// Modifie le contenu d'un événement existant (titre, description, lieu,
// horaires, rémunéré), y compris un événement déjà terminé — utile pour
// corriger une erreur de saisie (ex. mauvaise date). L'audience (comité ou
// tout le monde) n'est en revanche jamais modifiable après création, pour
// ne pas basculer une séance confidentielle par erreur.
export async function updateEvent(formData: FormData) {
  const user = await requireOrganisationUser();
  const id = String(formData.get("id"));

  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing || !canAccessEventAudience(existing.audience, user.role)) {
    throw new Error("Événement introuvable");
  }
  if (!existing.active) {
    throw new Error("Un événement archivé ne peut plus être modifié");
  }

  const parsed = eventUpdateSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    location: formData.get("location") || undefined,
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt") || undefined,
    paid: formData.get("paid") === "on" ? true : undefined,
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

  await prisma.event.update({
    where: { id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      location: parsed.data.location ?? null,
      startsAt,
      endsAt,
      paid: parsed.data.paid ?? false,
    },
  });

  revalidatePath("/evenements");
  revalidatePath(`/evenements/${id}`);
  revalidatePath("/organisation/evenements");
  revalidatePath(`/organisation/evenements/${id}`);
  revalidatePath("/");
}

export async function archiveEvent(formData: FormData) {
  await requireOrganisationUser();
  const id = String(formData.get("id"));

  await prisma.event.update({ where: { id }, data: { active: false } });

  revalidatePath("/evenements");
  revalidatePath("/organisation/evenements");
  revalidatePath("/");
}

export async function unarchiveEvent(formData: FormData) {
  await requireOrganisationUser();
  const id = String(formData.get("id"));

  await prisma.event.update({ where: { id }, data: { active: true } });

  revalidatePath("/evenements");
  revalidatePath("/organisation/evenements");
  revalidatePath("/");
}

export async function deleteEvent(formData: FormData) {
  await requireOrganisationUser();
  const id = String(formData.get("id"));

  const event = await prisma.event.findUniqueOrThrow({ where: { id } });
  if (event.active) {
    throw new Error("Archivez d'abord cet événement avant de le supprimer");
  }

  await prisma.event.delete({ where: { id } });

  revalidatePath("/evenements");
  revalidatePath("/organisation/evenements");
  revalidatePath("/");
}

export async function toggleEventPaid(formData: FormData) {
  const id = String(formData.get("id"));
  await requireOrganisationUser();

  const event = await prisma.event.findUniqueOrThrow({ where: { id } });
  await prisma.event.update({
    where: { id },
    data: { paid: !event.paid },
  });

  revalidatePath("/evenements");
  revalidatePath("/organisation/evenements");
  revalidatePath(`/organisation/evenements/${id}`);
}

export async function updateEventAgenda(formData: FormData) {
  const user = await requireOrganisationUser();
  const eventId = String(formData.get("eventId"));
  const agenda = String(formData.get("agenda") ?? "").trim();

  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  if (!canAccessEventAudience(event.audience, user.role)) {
    throw new Error("Accès refusé");
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { agenda: agenda || null },
  });

  revalidatePath(`/organisation/evenements/${eventId}`);
}

export async function uploadEventRecording(formData: FormData) {
  const user = await requireOrganisationUser();
  const eventId = String(formData.get("eventId"));
  const file = formData.get("recording");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Aucun enregistrement reçu");
  }

  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  if (!canAccessEventAudience(event.audience, user.role)) {
    throw new Error("Accès refusé");
  }

  const filename = await saveRecording(eventId, file);
  await deleteRecording(event.recordingPath);
  await prisma.event.update({
    where: { id: eventId },
    data: { recordingPath: filename },
  });

  revalidatePath(`/organisation/evenements/${eventId}`);
}

export async function deleteEventRecording(formData: FormData) {
  const user = await requireOrganisationUser();
  const eventId = String(formData.get("eventId"));

  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  if (!canAccessEventAudience(event.audience, user.role)) {
    throw new Error("Accès refusé");
  }

  await deleteRecording(event.recordingPath);
  await prisma.event.update({
    where: { id: eventId },
    data: { recordingPath: null },
  });

  revalidatePath(`/organisation/evenements/${eventId}`);
}

// ---------- Modèles d'événements (événements cycliques) ----------

const eventTemplateSchema = z.object({
  name: z.string().trim().min(1, "Le nom du modèle est requis").max(200),
  title: z.string().trim().min(1, "Le titre est requis").max(200),
  description: z.string().trim().max(5000).optional(),
  location: z.string().trim().max(200).optional(),
  paid: z.coerce.boolean().optional(),
});

export async function createEventTemplate(formData: FormData) {
  await requireOrganisationUser();

  const parsed = eventTemplateSchema.safeParse({
    name: formData.get("name"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    location: formData.get("location") || undefined,
    paid: formData.get("paid") === "on" ? true : undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Champs invalides");
  }

  await prisma.eventTemplate.create({
    data: {
      name: parsed.data.name,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      location: parsed.data.location ?? null,
      paid: parsed.data.paid ?? false,
    },
  });

  revalidatePath("/organisation/evenements/modeles");
}

export async function deleteEventTemplate(formData: FormData) {
  await requireOrganisationUser();
  const id = String(formData.get("id"));

  await prisma.eventTemplate.delete({ where: { id } });

  revalidatePath("/organisation/evenements/modeles");
}

// daysBeforeEvent n'a pas de borne minimale : une valeur négative signifie
// une échéance après l'événement (ex. rapport, synthèse à rédiger après le
// troc annuel).
const taskTemplateSchema = z.object({
  eventTemplateId: z.string().min(1),
  title: z.string().trim().min(1, "Le titre est requis").max(200),
  description: z.string().trim().max(2000).optional(),
  daysBeforeEvent: z.coerce.number().int(),
  reminderDaysBefore: z.union([z.coerce.number().int().min(0), z.literal("")]).optional(),
});

export async function addTaskTemplate(formData: FormData) {
  await requireOrganisationUser();

  const reminderRaw = formData.get("reminderDaysBefore");
  const parsed = taskTemplateSchema.safeParse({
    eventTemplateId: formData.get("eventTemplateId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    daysBeforeEvent: formData.get("daysBeforeEvent"),
    reminderDaysBefore: reminderRaw === null || reminderRaw === "" ? undefined : reminderRaw,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Champs invalides");
  }

  const count = await prisma.eventTaskTemplate.count({
    where: { eventTemplateId: parsed.data.eventTemplateId },
  });

  await prisma.eventTaskTemplate.create({
    data: {
      eventTemplateId: parsed.data.eventTemplateId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      daysBeforeEvent: parsed.data.daysBeforeEvent,
      reminderDaysBefore:
        typeof parsed.data.reminderDaysBefore === "number" ? parsed.data.reminderDaysBefore : null,
      order: count,
    },
  });

  revalidatePath("/organisation/evenements/modeles");
}

const taskTemplateUpdateSchema = taskTemplateSchema
  .omit({ eventTemplateId: true })
  .extend({ id: z.string().min(1) });

export async function updateTaskTemplate(formData: FormData) {
  await requireOrganisationUser();

  const reminderRaw = formData.get("reminderDaysBefore");
  const parsed = taskTemplateUpdateSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    daysBeforeEvent: formData.get("daysBeforeEvent"),
    reminderDaysBefore: reminderRaw === null || reminderRaw === "" ? undefined : reminderRaw,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Champs invalides");
  }

  await prisma.eventTaskTemplate.update({
    where: { id: parsed.data.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      daysBeforeEvent: parsed.data.daysBeforeEvent,
      reminderDaysBefore:
        typeof parsed.data.reminderDaysBefore === "number" ? parsed.data.reminderDaysBefore : null,
    },
  });

  revalidatePath("/organisation/evenements/modeles");
}

export async function deleteTaskTemplate(formData: FormData) {
  await requireOrganisationUser();
  const id = String(formData.get("id"));

  await prisma.eventTaskTemplate.delete({ where: { id } });

  revalidatePath("/organisation/evenements/modeles");
}

const createFromTemplateSchema = z.object({
  eventTemplateId: z.string().min(1),
  startsAt: z.string().min(1, "La date de début est requise"),
  endsAt: z.string().optional(),
});

// Crée un événement à partir d'un modèle (ex. le troc annuel) : reprend
// titre/description/lieu/rémunéré du modèle, et génère une Task pour
// chaque tâche type, avec une échéance calculée en reculant de
// `daysBeforeEvent` jours depuis la date choisie ici — pas depuis une date
// fixe, puisque l'événement peut tomber à une date différente chaque
// année. Les tâches générées n'ont pas d'assigné·e à la création (voir
// updateTaskAssignees pour les répartir ensuite).
export async function createEventFromTemplate(formData: FormData) {
  const user = await requireOrganisationUser();

  const parsed = createFromTemplateSchema.safeParse({
    eventTemplateId: formData.get("eventTemplateId"),
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

  const template = await prisma.eventTemplate.findUnique({
    where: { id: parsed.data.eventTemplateId },
    include: { taskTemplates: { orderBy: { order: "asc" } } },
  });
  if (!template) {
    throw new Error("Modèle introuvable");
  }

  const event = await prisma.event.create({
    data: {
      title: template.title,
      description: template.description,
      location: template.location,
      paid: template.paid,
      startsAt,
      endsAt,
      audience: "ALL",
      createdById: user.id,
      eventTemplateId: template.id,
    },
  });

  if (template.taskTemplates.length > 0) {
    // dueDate normalisée à minuit UTC du jour calendaire de l'événement,
    // comme les autres champs "date seule" de l'app (voir createTask et
    // checkAndSendTaskReminders) — sinon l'heure de l'événement (ex. 23h)
    // pourrait faire basculer le calcul sur le mauvais jour UTC.
    const eventDay = new Date(
      Date.UTC(startsAt.getFullYear(), startsAt.getMonth(), startsAt.getDate())
    );
    await prisma.task.createMany({
      data: template.taskTemplates.map((tt) => {
        const dueDate = new Date(eventDay);
        dueDate.setUTCDate(dueDate.getUTCDate() - tt.daysBeforeEvent);
        return {
          eventId: event.id,
          title: tt.title,
          dueDate,
          reminderDaysBefore: tt.reminderDaysBefore,
        };
      }),
    });
  }

  revalidatePath("/evenements");
  revalidatePath("/organisation/evenements");
  revalidatePath("/");

  redirect(`/organisation/evenements/${event.id}`);
}

// ---------- Présences ----------

export async function addVolunteerToEvent(formData: FormData) {
  const eventId = String(formData.get("eventId"));
  const userId = String(formData.get("userId"));
  if (!eventId || !userId) {
    throw new Error("Champs invalides");
  }
  await requireOrganisationUser();

  // Une séance comité ne peut accueillir que des membres du comité, même
  // via une requête forgée — pas seulement un filtrage côté formulaire.
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { audience: true } });
  if (event?.audience === "COMITE") {
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (target?.role !== "COMITE") {
      throw new Error("Seul·es les membres du comité peuvent être ajouté·es à une séance comité");
    }
  }

  await prisma.eventSignup.upsert({
    where: { eventId_userId: { eventId, userId } },
    update: {},
    create: { eventId, userId },
  });

  revalidatePath(`/organisation/evenements/${eventId}`);
  revalidatePath("/evenements");
  revalidatePath("/");
}

export async function removeEventSignup(formData: FormData) {
  const signupId = String(formData.get("signupId"));
  const eventId = String(formData.get("eventId"));
  await requireOrganisationUser();

  await prisma.eventSignup.delete({ where: { id: signupId } });

  revalidatePath(`/organisation/evenements/${eventId}`);
  revalidatePath("/evenements");
  revalidatePath("/");
}

export async function markArrival(formData: FormData) {
  const eventSignupId = String(formData.get("eventSignupId"));
  const eventId = String(formData.get("eventId"));
  await requireOrganisationUser();

  const openSession = await prisma.attendanceSession.findFirst({
    where: { eventSignupId, leftAt: null },
  });
  if (!openSession) {
    await prisma.attendanceSession.create({
      data: { eventSignupId, arrivedAt: new Date() },
    });
  }

  revalidatePath(`/organisation/evenements/${eventId}`);
}

export async function markDeparture(formData: FormData) {
  const eventSignupId = String(formData.get("eventSignupId"));
  const eventId = String(formData.get("eventId"));
  await requireOrganisationUser();

  const openSession = await prisma.attendanceSession.findFirst({
    where: { eventSignupId, leftAt: null },
    orderBy: { arrivedAt: "desc" },
  });
  if (openSession) {
    await prisma.attendanceSession.update({
      where: { id: openSession.id },
      data: { leftAt: new Date() },
    });
  }

  revalidatePath(`/organisation/evenements/${eventId}`);
}

export async function togglePullLoaned(formData: FormData) {
  const eventSignupId = String(formData.get("eventSignupId"));
  const eventId = String(formData.get("eventId"));
  await requireOrganisationUser();

  const signup = await prisma.eventSignup.findUniqueOrThrow({
    where: { id: eventSignupId },
  });
  await prisma.eventSignup.update({
    where: { id: eventSignupId },
    data: { pullLoaned: !signup.pullLoaned },
  });

  revalidatePath(`/organisation/evenements/${eventId}`);
}

const manualTimeSchema = z.object({
  eventSignupId: z.string().min(1),
  eventId: z.string().min(1),
  minutes: z.coerce.number().int().min(1).max(1440),
});

export async function addManualTime(formData: FormData) {
  const parsed = manualTimeSchema.safeParse({
    eventSignupId: formData.get("eventSignupId"),
    eventId: formData.get("eventId"),
    minutes: formData.get("minutes"),
  });
  if (!parsed.success) {
    throw new Error("Durée invalide (entre 1 et 1440 minutes)");
  }
  await requireOrganisationUser();

  const leftAt = new Date();
  const arrivedAt = new Date(leftAt.getTime() - parsed.data.minutes * 60000);
  await prisma.attendanceSession.create({
    data: {
      eventSignupId: parsed.data.eventSignupId,
      arrivedAt,
      leftAt,
      manual: true,
    },
  });

  revalidatePath(`/organisation/evenements/${parsed.data.eventId}`);
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

  if (mailConfigured()) {
    try {
      await sendWelcomeEmail(parsed.data.name, parsed.data.email, parsed.data.password);
    } catch (err) {
      // La création du compte ne doit pas échouer si l'email ne part pas :
      // les identifiants restent transmissibles manuellement.
      console.error("Échec de l'envoi de l'email de bienvenue :", err);
    }
  }

  revalidatePath("/annuaire");
  revalidatePath("/organisation/benevoles");
}

async function sendWelcomeEmail(
  name: string,
  email: string,
  password: string
): Promise<void> {
  const url = process.env.AUTH_URL;
  const attachments = (await guideExists())
    ? [{ filename: "mode-emploi.pdf", path: guideAttachmentPath() }]
    : undefined;

  const lines = [
    `Bonjour ${name},`,
    "",
    "Un compte a été créé pour vous sur la plateforme des bénévoles de la Ludothèque Nyon Région.",
    "",
    ...(url ? [`Adresse : ${url}`] : []),
    `Identifiant : ${email}`,
    `Mot de passe provisoire : ${password}`,
    "",
    'Nous vous recommandons de changer ce mot de passe dès votre première connexion (menu "Mon profil").',
    ...(attachments
      ? ["", "Vous trouverez en pièce jointe un mode d'emploi des fonctionnalités."]
      : []),
    "",
    "À bientôt,",
    "L'équipe de la Ludothèque Nyon Région",
  ];

  const html = lines
    .map((line) => (line ? `<p>${line}</p>` : ""))
    .join("\n")
    .replace(
      `<p>Identifiant : ${email}</p>`,
      `<p>Identifiant : <strong>${email}</strong></p>`
    )
    .replace(
      `<p>Mot de passe provisoire : ${password}</p>`,
      `<p>Mot de passe provisoire : <strong>${password}</strong></p>`
    );

  await sendMail({
    to: email,
    subject: "Bienvenue sur la plateforme des bénévoles — vos identifiants",
    text: lines.join("\n"),
    html,
    attachments,
  });
}

const volunteerProfileSchema = z.object({
  id: z.string().min(1),
  role: z.enum(ROLES).optional(),
});

// Un seul bouton "Enregistrer" par bénévole dans la liste de gestion, pour
// le rôle, le poste et les disponibilités à la fois — plutôt que trois
// formulaires séparés. Le champ "role" est absent du formulaire (select
// désactivé côté client) quand on tente de modifier son propre compte ;
// "poste" est absent pour les rôles autres que bénévole (case non rendue).
export async function updateVolunteerProfile(formData: FormData) {
  const currentUser = await requireOrganisationUser();

  const roleRaw = formData.get("role");
  const parsed = volunteerProfileSchema.safeParse({
    id: formData.get("id"),
    role: roleRaw === null ? undefined : roleRaw,
  });
  if (!parsed.success) {
    throw new Error("Champs invalides");
  }
  const { id, role } = parsed.data;

  if (role) {
    if (id === currentUser.id) {
      throw new Error("Vous ne pouvez pas modifier votre propre rôle");
    }
    await prisma.user.update({ where: { id }, data: { role } });
  }

  const posteRaw = formData.get("poste");
  if (posteRaw !== null) {
    const rawStr = String(posteRaw);
    const poste = rawStr && isValidPoste(rawStr) ? rawStr : null;
    await prisma.user.update({ where: { id }, data: { poste } });
  }

  function readSize(field: string): string | null {
    const raw = formData.get(field);
    const str = raw === null ? "" : String(raw);
    return str && isValidClothingSize(str) ? str : null;
  }
  function readCut(field: string): string | null {
    const raw = formData.get(field);
    const str = raw === null ? "" : String(raw);
    return str && isValidClothingCut(str) ? str : null;
  }

  await prisma.user.update({
    where: { id },
    data: {
      poloReceived: formData.get("poloReceived") === "on",
      poloSize: readSize("poloSize"),
      poloCut: readCut("poloCut"),
      pullReceived: formData.get("pullReceived") === "on",
      pullSize: readSize("pullSize"),
      pullCut: readCut("pullCut"),
    },
  });

  const validKeys = new Set(getAvailabilityOptions().map((o) => o.slotKey));
  const selectedSlots = formData.getAll("slots").map(String).filter((k) => validKeys.has(k));
  await prisma.$transaction([
    prisma.volunteerAvailability.deleteMany({ where: { userId: id } }),
    prisma.volunteerAvailability.createMany({
      data: selectedSlots.map((slotKey) => ({ userId: id, slotKey })),
    }),
  ]);

  revalidatePath("/annuaire");
  revalidatePath("/organisation/benevoles");
  revalidatePath("/profil");
}

export async function archiveVolunteer(formData: FormData) {
  const currentUser = await requireOrganisationUser();
  const id = String(formData.get("id"));

  if (id === currentUser.id) {
    throw new Error("Vous ne pouvez pas archiver votre propre compte");
  }

  await prisma.user.update({ where: { id }, data: { active: false } });

  revalidatePath("/annuaire");
  revalidatePath("/organisation/benevoles");
}

export async function unarchiveVolunteer(formData: FormData) {
  await requireOrganisationUser();
  const id = String(formData.get("id"));

  await prisma.user.update({ where: { id }, data: { active: true } });

  revalidatePath("/annuaire");
  revalidatePath("/organisation/benevoles");
}

export async function deleteVolunteer(formData: FormData) {
  const currentUser = await requireOrganisationUser();
  const id = String(formData.get("id"));

  if (id === currentUser.id) {
    throw new Error("Vous ne pouvez pas supprimer votre propre compte");
  }

  const target = await prisma.user.findUniqueOrThrow({ where: { id } });
  if (target.active) {
    throw new Error("Archivez d'abord ce compte avant de le supprimer");
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

export async function updateVolunteerPhoto(formData: FormData) {
  await requireOrganisationUser();
  const id = String(formData.get("id"));
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Aucune image sélectionnée");
  }

  const current = await prisma.user.findUniqueOrThrow({
    where: { id },
    select: { photoPath: true },
  });

  const filename = await savePhoto(id, file);
  await prisma.user.update({ where: { id }, data: { photoPath: filename } });
  await deletePhoto(current.photoPath);

  revalidatePath("/annuaire");
  revalidatePath("/organisation/benevoles");
}

// ---------- Tâches ----------

const taskSchema = z.object({
  eventId: z.string().min(1),
  title: z.string().trim().min(1, "Le titre est requis").max(200),
  dueDate: z.string().min(1, "La date limite est requise"),
  assigneeIds: z.array(z.string().min(1)).min(1, "Choisissez au moins une personne"),
  reminderDaysBefore: z.union([z.coerce.number().int().min(0), z.literal("")]).optional(),
});

export async function createTask(formData: FormData) {
  await requireOrganisationUser();

  const reminderRaw = formData.get("reminderDaysBefore");
  const parsed = taskSchema.safeParse({
    eventId: formData.get("eventId"),
    title: formData.get("title"),
    dueDate: formData.get("dueDate"),
    assigneeIds: formData.getAll("assigneeIds"),
    reminderDaysBefore: reminderRaw === null || reminderRaw === "" ? undefined : reminderRaw,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Champs invalides");
  }

  const dueDate = new Date(parsed.data.dueDate);
  if (Number.isNaN(dueDate.getTime())) {
    throw new Error("Date limite invalide");
  }

  await prisma.task.create({
    data: {
      eventId: parsed.data.eventId,
      title: parsed.data.title,
      dueDate,
      reminderDaysBefore:
        typeof parsed.data.reminderDaysBefore === "number" ? parsed.data.reminderDaysBefore : null,
      assignees: {
        create: parsed.data.assigneeIds.map((userId) => ({ userId })),
      },
    },
  });

  revalidatePath(`/organisation/evenements/${parsed.data.eventId}`);
  revalidatePath("/profil");
}

export async function deleteTask(formData: FormData) {
  await requireOrganisationUser();
  const id = String(formData.get("id"));
  const eventId = String(formData.get("eventId"));

  await prisma.task.delete({ where: { id } });

  revalidatePath(`/organisation/evenements/${eventId}`);
  revalidatePath("/profil");
}

// Remplace la liste des assigné·e·s d'une tâche existante — nécessaire
// notamment pour répartir les tâches générées depuis un modèle d'événement
// (créées sans assigné·e à la création, voir createEventFromTemplate).
export async function updateTaskAssignees(formData: FormData) {
  await requireOrganisationUser();
  const id = String(formData.get("id"));
  const eventId = String(formData.get("eventId"));
  const assigneeIds = formData.getAll("assigneeIds").map(String).filter(Boolean);

  if (assigneeIds.length === 0) {
    throw new Error("Choisissez au moins une personne");
  }

  await prisma.$transaction([
    prisma.taskAssignee.deleteMany({ where: { taskId: id } }),
    prisma.taskAssignee.createMany({
      data: assigneeIds.map((userId) => ({ taskId: id, userId })),
    }),
  ]);

  revalidatePath(`/organisation/evenements/${eventId}`);
  revalidatePath("/profil");
}

export async function toggleTaskDone(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));

  const task = await prisma.task.findUniqueOrThrow({
    where: { id },
    include: { assignees: true },
  });
  const isAssignee = task.assignees.some((a) => a.userId === user.id);
  if (!isAssignee && !isOrganisationRole(user.role)) {
    throw new Error("Vous n'êtes pas autorisé·e à modifier cette tâche");
  }

  await prisma.task.update({
    where: { id },
    data: { done: !task.done },
  });

  revalidatePath(`/organisation/evenements/${task.eventId}`);
  revalidatePath("/profil");
}

// ---------- Notifications ----------

const notificationSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis").max(100),
  body: z.string().trim().min(1, "Le message est requis").max(500),
  target: z.enum(["all", "organisation"]),
});

export async function sendManualNotification(formData: FormData) {
  const currentUser = await requireOrganisationUser();

  const parsed = notificationSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    target: formData.get("target"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Champs invalides");
  }

  const isOrganisationOnly = parsed.data.target === "organisation";

  const users = await prisma.user.findMany({
    where: {
      active: true,
      ...(isOrganisationOnly
        ? { role: { in: ["RESPONSABLE", "COMITE"] } }
        : {}),
    },
    select: { id: true, name: true },
  });

  // La notification est aussi relayée dans les annonces, avec la même
  // audience : un·e bénévole ne doit jamais voir une annonce destinée
  // uniquement aux responsables/comité.
  await prisma.announcement.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      audience: isOrganisationOnly ? "ORGANISATION" : "ALL",
      authorId: currentUser.id,
    },
  });

  await sendPushToUsers(
    users.map((u) => u.id),
    { title: parsed.data.title, body: parsed.data.body, url: "/annonces" }
  );
  await prisma.pushNotificationLog.create({
    data: {
      category: "MANUAL",
      title: parsed.data.title,
      body: parsed.data.body,
      recipients: users.length,
      recipientNames: users.map((u) => u.name).join(", "),
    },
  });

  revalidatePath("/annonces");
  revalidatePath("/organisation/annonces");
  revalidatePath("/organisation/notifications");
  revalidatePath("/");
}

// ---------- Paramètres (mode d'emploi) ----------

export async function uploadGuide(formData: FormData) {
  await requireOrganisationUser();

  const file = formData.get("guide");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Aucun fichier sélectionné");
  }

  await saveGuide(file);
  revalidatePath("/organisation/parametres");
}

export async function removeGuide() {
  await requireOrganisationUser();
  await deleteGuide();
  revalidatePath("/organisation/parametres");
}
