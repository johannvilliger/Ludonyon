import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ludonyon — Espace bénévoles",
    short_name: "Ludonyon",
    description:
      "Espace communautaire des bénévoles de la Ludothèque Nyon Région.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#f6d915",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
