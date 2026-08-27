"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

type ResultatScan = { ok: boolean; message: string };

// L'autorisation caméra du système Android (visible dans les paramètres de
// l'appli) est distincte de l'autorisation par SITE que garde le navigateur
// lui-même — une appli autorisée peut quand même avoir un site bloqué. Le
// message distingue donc ce cas (le plus fréquent en pratique) des vraies
// pannes matérielles.
function messageErreurCamera(err: unknown): string {
  const nom = err instanceof DOMException ? err.name : "";
  if (nom === "NotAllowedError") {
    return "Caméra bloquée pour ce site précisément (différent de l'autorisation de l'appli dans les réglages Android) — appuyez sur le cadenas à côté de l'adresse, autorisez la caméra pour ce site, puis rechargez la page.";
  }
  if (nom === "NotReadableError") {
    return "La caméra est peut-être utilisée par une autre application — fermez-la puis réessayez.";
  }
  if (nom === "NotFoundError") {
    return "Aucune caméra détectée sur cet appareil.";
  }
  return "Impossible d'accéder à la caméra — vérifiez les autorisations du site (pas seulement de l'appli) via le cadenas à côté de l'adresse.";
}

export function CameraScanner({
  onScan,
  onClose,
}: {
  onScan: (valeur: string) => Promise<ResultatScan>;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [erreurCamera, setErreurCamera] = useState<string | null>(null);
  const [dernierResultat, setDernierResultat] = useState<ResultatScan | null>(null);

  // Refs pour que la boucle de lecture (montée une seule fois) voie toujours
  // la version à jour de onScan et de la pause après un scan, sans redémarrer
  // la caméra à chaque re-rendu du composant. Synchronisée après le rendu
  // (pas pendant) : une ref ne doit jamais être modifiée en cours de rendu.
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  });
  const enPauseRef = useRef(false);

  useEffect(() => {
    let annule = false;
    let frameId = 0;
    let stream: MediaStream | null = null;

    async function demarrer() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch (err) {
        // Certains navigateurs (Samsung Internet notamment) refusent la
        // contrainte facingMode si l'appareil a plusieurs caméras arrière
        // (plusieurs objectifs, écran pliable...) — on retente sans
        // contrainte de caméra avant d'abandonner.
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch {
          if (!annule) setErreurCamera(messageErreurCamera(err));
          return;
        }
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
      if (enPauseRef.current || !video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
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
        enPauseRef.current = true;
        onScanRef.current(resultat.data).then((r) => {
          if (annule) return;
          setDernierResultat(r);
          // Pause courte pour laisser le temps de retirer l'étiquette du
          // champ de la caméra avant de reprendre la détection — sinon le
          // même code repasse et redéclenche un scan en boucle.
          setTimeout(() => {
            enPauseRef.current = false;
            setDernierResultat(null);
          }, 1200);
        });
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
        {dernierResultat && (
          <div
            className={`absolute inset-x-0 bottom-0 px-4 py-3 text-center text-sm font-medium text-white ${
              dernierResultat.ok ? "bg-emerald-600/90" : "bg-red-600/90"
            }`}
          >
            {dernierResultat.message}
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {erreurCamera && <p className="mt-4 max-w-sm text-center text-sm text-red-300">{erreurCamera}</p>}
      {!erreurCamera && (
        <p className="mt-4 max-w-sm text-center text-sm text-white/70">
          Visez le QR code de l&apos;étiquette — le scan continue automatiquement après chaque article.
        </p>
      )}

      <button
        type="button"
        onClick={onClose}
        className="mt-4 rounded-md border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
      >
        Terminé
      </button>
    </div>
  );
}
