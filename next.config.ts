import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Pas de nonce : l'appli ne charge aucun script/style tiers (vérifié — aucun
// fetch client vers un domaine externe, polices Geist auto-hébergées par
// next/font), donc pas besoin de la complexité du rendu dynamique forcé
// qu'exigerait un CSP à base de nonce (voir node_modules/next/dist/docs).
// 'unsafe-inline' reste nécessaire pour les styles (Tailwind/inline) mais
// script-src 'self' bloque déjà l'exécution de tout script chargé depuis un
// domaine externe, ce qui couvre l'essentiel du risque XSS.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // camera=(self) : le scanner QR de la caisse (camera-scanner.tsx)
          // utilise getUserMedia — un blanket camera=() bloque l'accès au
          // niveau du navigateur avant même le prompt de permission, quelle
          // que soit l'autorisation accordée au site. Micro/géoloc restent
          // désactivés, l'appli ne s'en sert jamais.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          // Ignoré par le navigateur tant que le site n'est pas servi en
          // HTTPS (dev local) — actif dès le passage en prod sur Infomaniak.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
