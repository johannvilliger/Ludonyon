import type { MetadataRoute } from "next";
import { urlAbsolue } from "@/lib/url";

export const dynamic = "force-dynamic";

// Seules les pages publiques et indexables (voir robots.ts) — tout le reste
// est protégé par un code d'accès ou n'a de sens que via un lien personnel.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await urlAbsolue("");

  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/comment-ca-marche`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/vendeur/nouveau`, changeFrequency: "weekly", priority: 0.9 },
  ];
}
