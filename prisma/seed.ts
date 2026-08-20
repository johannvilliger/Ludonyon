import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function upsertUser(data: {
  name: string;
  email: string;
  password: string;
  role: "BENEVOLE" | "RESPONSABLE" | "COMITE";
  phone?: string;
  skills?: string;
}) {
  const passwordHash = await bcrypt.hash(data.password, 10);
  return prisma.user.upsert({
    where: { email: data.email },
    update: {},
    create: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      phone: data.phone,
      skills: data.skills,
    },
  });
}

async function main() {
  const admin = await upsertUser({
    name: "Comité Ludonyon",
    email: "comite@ludonyon.ch",
    password: "ludonyon2024",
    role: "COMITE",
    skills: "Coordination générale",
  });

  const responsable = await upsertUser({
    name: "Responsable Accueil",
    email: "responsable@ludonyon.ch",
    password: "ludonyon2024",
    role: "RESPONSABLE",
    skills: "Ouverture / fermeture, accueil du public",
  });

  const benevole1 = await upsertUser({
    name: "Alex Martin",
    email: "alex.martin@example.ch",
    password: "benevole2024",
    role: "BENEVOLE",
    phone: "079 000 00 01",
    skills: "Animation, disponible le mercredi après-midi",
  });

  await upsertUser({
    name: "Chris Rochat",
    email: "chris.rochat@example.ch",
    password: "benevole2024",
    role: "BENEVOLE",
    phone: "079 000 00 02",
    skills: "Rangement, prêt de jeux, disponible le samedi",
  });

  await prisma.announcement.create({
    data: {
      title: "Bienvenue sur Ludonyon !",
      body: "Voici le nouvel espace des bénévoles : retrouvez ici les annonces de l'équipe et les événements à venir. Bonne visite !",
      authorId: admin.id,
    },
  });

  const nextSaturday = new Date();
  nextSaturday.setDate(nextSaturday.getDate() + ((6 - nextSaturday.getDay() + 7) % 7 || 7));
  nextSaturday.setHours(10, 0, 0, 0);
  const nextSaturdayEnd = new Date(nextSaturday);
  nextSaturdayEnd.setHours(13, 0, 0, 0);

  const event = await prisma.event.create({
    data: {
      title: "Permanence du samedi",
      description: "Accueil du public, prêt et retour de jeux.",
      location: "Ludothèque Nyon Région",
      startsAt: nextSaturday,
      endsAt: nextSaturdayEnd,
      createdById: responsable.id,
    },
  });

  await prisma.eventSignup.upsert({
    where: { eventId_userId: { eventId: event.id, userId: benevole1.id } },
    update: {},
    create: { eventId: event.id, userId: benevole1.id },
  });

  console.log("Comptes de démonstration créés :");
  console.log("  comite@ludonyon.ch        / ludonyon2024   (Comité)");
  console.log("  responsable@ludonyon.ch   / ludonyon2024   (Responsable)");
  console.log("  alex.martin@example.ch    / benevole2024   (Bénévole)");
  console.log("  chris.rochat@example.ch   / benevole2024   (Bénévole)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
