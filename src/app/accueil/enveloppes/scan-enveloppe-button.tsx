"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { CameraScannerVendeur } from "../camera-scanner-vendeur";

// Même détection mobile-only que ScanVendeurButton (voir ce fichier) : pas
// de bouton caméra sur un poste de bureau qui n'en a pas.
function detecterMobile(): boolean {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
function sAbonner() {
  return () => {};
}
function snapshotServeur() {
  return false;
}

export function ScanEnveloppeButton() {
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
            router.push(`/accueil/enveloppes/${code}`);
          }}
          onClose={() => setOuvert(false)}
        />
      )}
    </>
  );
}
