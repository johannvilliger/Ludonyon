"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

export function CameraScannerVendeur({
  onScan,
  onClose,
}: {
  onScan: (valeur: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [erreurCamera, setErreurCamera] = useState<string | null>(null);

  // Ref pour que la boucle de lecture (montée une seule fois) voie toujours
  // la version à jour de onScan sans redémarrer la caméra à chaque
  // re-rendu. Synchronisée après le rendu, jamais pendant.
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  });

  useEffect(() => {
    let annule = false;
    let frameId = 0;
    let stream: MediaStream | null = null;

    async function demarrer() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch {
        if (!annule) {
          setErreurCamera("Impossible d'accéder à la caméra — vérifiez les autorisations du navigateur.");
        }
        return;
      }
      if (annule) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      frameId = requestAnimationFrame(boucle);
    }

    function boucle() {
      if (annule) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        frameId = requestAnimationFrame(boucle);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        frameId = requestAnimationFrame(boucle);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const resultat = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });

      if (resultat?.data) {
        // Contrairement à la caisse : un seul scan, on repart directement
        // (pas de reprise de la détection) — le parent ferme l'aperçu.
        onScanRef.current(resultat.data);
        return;
      }

      frameId = requestAnimationFrame(boucle);
    }

    demarrer();

    return () => {
      annule = true;
      cancelAnimationFrame(frameId);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4">
      <div className="relative w-full max-w-sm overflow-hidden rounded-lg bg-black">
        <video ref={videoRef} playsInline muted className="w-full" />
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {erreurCamera && <p className="mt-4 max-w-sm text-center text-sm text-red-300">{erreurCamera}</p>}
      {!erreurCamera && (
        <p className="mt-4 max-w-sm text-center text-sm text-white/70">
          Visez le QR code de confirmation du vendeur.
        </p>
      )}

      <button
        type="button"
        onClick={onClose}
        className="mt-4 rounded-md border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
      >
        Annuler
      </button>
    </div>
  );
}
