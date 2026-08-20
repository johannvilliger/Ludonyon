import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Pas de "sharp" installé sur l'hébergement (pas nécessaire pour ce
    // volume de trafic) : on sert les images telles quelles plutôt que de
    // les faire passer par l'optimiseur serveur de Next.
    unoptimized: true,
  },
};

export default nextConfig;
