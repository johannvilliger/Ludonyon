import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { queryOne } from "@/lib/db";
import "./globals.css";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Troc annuel de la Ludothèque Nyon Région",
  description: "Dépôt de listes, contrôle, vente et clôture du troc annuel.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Masque le login bénévole dans l'en-tête une fois le message de fin de
  // troc actif (voir src/app/page.tsx et modifierMessageFinTroc) — le
  // header est posé ici, hors de la page d'accueil elle-même, donc la seule
  // façon de le faire suivre la même condition est de la relire ici aussi.
  const parametres = await queryOne<{ phase: string | null; message_fin_troc: string | null }>(
    `SELECT e.phase, p.message_fin_troc
     FROM parametres_gestion p
     LEFT JOIN editions e ON e.active_flag = 1
     WHERE p.id = 1`,
  );
  const siteEnClotureAvecMessage = parametres?.phase === "post_vente" && Boolean(parametres.message_fin_troc?.trim());

  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader masquerLoginBenevole={siteEnClotureAvecMessage} />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
