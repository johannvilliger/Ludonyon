"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // installation impossible (navigateur trop ancien, contexte non
        // sécurisé...) : l'appli reste utilisable sans PWA/notifications
      });
    }
  }, []);

  return null;
}
