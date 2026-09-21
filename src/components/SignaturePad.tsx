"use client";

import { useRef, useState } from "react";

// Pavé de signature tactile en canvas simple (pointer events, marche au
// doigt comme à la souris) — pas de librairie externe, juste tracer des
// segments entre positions successives du pointeur.
export function SignaturePad({ onValider }: { onValider: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dessineRef = useRef(false);
  const dernierePositionRef = useRef<{ x: number; y: number } | null>(null);
  const [aSigne, setASigne] = useState(false);

  function position(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function demarrer(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dessineRef.current = true;
    dernierePositionRef.current = position(e);
  }

  function dessiner(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dessineRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const actuelle = position(e);
    const derniere = dernierePositionRef.current ?? actuelle;
    ctx.strokeStyle = "#18181b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(derniere.x, derniere.y);
    ctx.lineTo(actuelle.x, actuelle.y);
    ctx.stroke();
    dernierePositionRef.current = actuelle;
    if (!aSigne) setASigne(true);
  }

  function arreter() {
    dessineRef.current = false;
    dernierePositionRef.current = null;
  }

  function effacer() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setASigne(false);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={480}
        height={200}
        onPointerDown={demarrer}
        onPointerMove={dessiner}
        onPointerUp={arreter}
        onPointerLeave={arreter}
        className="w-full touch-none rounded-md border border-zinc-300 bg-white"
        style={{ aspectRatio: "480 / 200" }}
      />
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={effacer}
          disabled={!aSigne}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:border-zinc-400 disabled:opacity-50"
        >
          Effacer
        </button>
        <button
          type="button"
          disabled={!aSigne}
          onClick={() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            onValider(canvas.toDataURL("image/png"));
          }}
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          Confirmer la remise
        </button>
      </div>
    </div>
  );
}
