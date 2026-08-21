import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Pas de "sharp" installé sur l'hébergement (pas nécessaire pour ce
    // volume de trafic) : on sert les images telles quelles plutôt que de
    // les faire passer par l'optimiseur serveur de Next.
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      // Relevé pour les enregistrements audio des séances comité (jusqu'à
      // ~200 Mo, voir MAX_RECORDING_SIZE dans recordingStorage.ts) ; les
      // photos, bien plus petites, restent inchangées (redimensionnées
      // côté navigateur, voir resizeImage.ts).
      bodySizeLimit: "220mb",
    },
  },
};

export default nextConfig;
