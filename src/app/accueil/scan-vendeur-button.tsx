"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { CameraScannerVendeur } from "./camera-scanner-vendeur";

// navigator.userAgent est statique le temps de la session : pas besoin de
// s'abonner à un vrai changement, juste de lire une valeur qui n'existe que
// côté client (useSyncExternalStore gère proprement l'écart serveur/client
// sans provoquer d'erreur d'hydratation) — même approche que côté caisse.
function detecterMobile(): boolean {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
function sAbonner() {
  return () => {};
}
function snapshotServeur() {
  return false;
}

export function ScanVendeurButton() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const estMobile = useSyncExternalStore(sAbonner, detecterMobile, snapshotServeur);

  if (!estMobile) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="w-full rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:border-zinc-400"
      >
        📷 Scanner le QR du vendeur
      </button>
      {ouvert && (
        <CameraScannerVendeur
          onScan={(code) => {
            setOuvert(false);
            router.push(`/accueil/vendeur/${code}`);
          }}
          onClose={() => setOuvert(false)}
        />
      )}
    </>
  );
}
