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
      // Les photos sont redimensionnées côté navigateur avant l'envoi (voir
      // resizeImage.ts), mais on garde une marge au-delà de la limite par
      // défaut de 1 Mo pour les cas où ça ne serait pas possible
      // (redimensionnement impossible sur le navigateur, formulaire soumis
      // sans JS...).
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
