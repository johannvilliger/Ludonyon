import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isOrganisationRole } from "@/lib/roles";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/connexion",
  },
  providers: [
    Credentials({
      name: "Identifiants",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });
        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    // Sert aussi à enregistrer la dernière activité (connexion ou simple
    // navigation) : ce callback tourne à chaque requête passant par le
    // proxy d'authentification (voir src/proxy.ts), pas seulement à la
    // connexion. Le timestamp de dernière écriture reste dans le token
    // lui-même pour éviter une lecture en base à chaque requête ; la
    // fenêtre de 5 minutes évite d'écrire en base à chaque navigation.
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      const userId = token.id as string | undefined;
      const lastSync = typeof token.lastSeenSyncAt === "number" ? token.lastSeenSyncAt : 0;
      if (userId && Date.now() - lastSync > 5 * 60 * 1000) {
        await prisma.user
          .update({ where: { id: userId }, data: { lastSeenAt: new Date() } })
          .catch(() => {});
        token.lastSeenSyncAt = Date.now();
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      if (pathname.startsWith("/connexion")) {
        return true;
      }
      if (!isLoggedIn) {
        return false;
      }
      if (pathname.startsWith("/organisation")) {
        return isOrganisationRole(auth.user.role as string);
      }
      return true;
    },
  },
});
