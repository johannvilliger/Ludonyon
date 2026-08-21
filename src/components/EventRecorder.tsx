"use client";

import { useRef, useState } from "react";

const CANDIDATE_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return CANDIDATE_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function EventRecorder({
  action,
  eventId,
}: {
  action: (formData: FormData) => Promise<void>;
  eventId: string;
}) {
  const [status, setStatus] = useState<"idle" | "recording" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function startRecording() {
    setError(null);
    const mimeType = pickMimeType();
    if (!mimeType) {
      setStatus("error");
      setError("Enregistrement audio non supporté par ce navigateur.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1 },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 32000,
      });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;

      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
      setStatus("recording");
    } catch {
      setStatus("error");
      setError("Accès au micro refusé ou indisponible.");
    }
  }

  async function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    stopTimer();
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    await stopped;

    setStatus("uploading");
    try {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      const ext = recorder.mimeType.includes("mp4") ? "mp4" : recorder.mimeType.includes("ogg") ? "ogg" : "webm";
      const file = new File([blob], `seance-${eventId}.${ext}`, { type: recorder.mimeType.split(";")[0] });

      const formData = new FormData();
      formData.set("eventId", eventId);
      formData.set("recording", file);
      await action(formData);
      setStatus("idle");
    } catch {
      setStatus("error");
      setError("Échec de l'envoi de l'enregistrement.");
    }
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      {status === "recording" ? (
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm font-medium text-red-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
            Enregistrement… {formatElapsed(elapsed)}
          </span>
          <button
            type="button"
            onClick={stopRecording}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
          >
            Arrêter et enregistrer
          </button>
        </div>
      ) : status === "uploading" ? (
        <p className="text-sm text-stone-600">Envoi de l&rsquo;enregistrement…</p>
      ) : (
        <button
          type="button"
          onClick={startRecording}
          className="rounded-lg border-2 border-black bg-brand-yellow px-3 py-1.5 text-sm font-semibold text-black hover:bg-brand-yellow-dark"
        >
          🎙️ Démarrer l&rsquo;enregistrement
        </button>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
