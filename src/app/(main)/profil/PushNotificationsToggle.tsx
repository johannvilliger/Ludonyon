"use client";

import { useEffect, useState } from "react";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/actions/profile";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

type Status = "checking" | "unsupported" | "enabled" | "disabled";

export default function PushNotificationsToggle() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setStatus(subscription ? "enabled" : "disabled");
    }
    check().catch(() => setStatus("unsupported"));
  }, []);

  async function handleEnable() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Autorisation refusée par le navigateur");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setError("Notifications non configurées sur ce site");
        return;
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = subscription.toJSON();
      await subscribeToPush({
        endpoint: json.endpoint!,
        p256dh: json.keys!.p256dh!,
        auth: json.keys!.auth!,
      });
      setStatus("enabled");
    } catch {
      setError("Impossible d'activer les notifications");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeFromPush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("disabled");
    } catch {
      setError("Impossible de désactiver les notifications");
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking") return null;

  return (
    <div className="mt-3 rounded-xl border border-stone-200 bg-white p-4">
      {status === "unsupported" ? (
        <p className="text-sm text-stone-500">
          Notifications non supportées par ce navigateur. Sur iPhone,
          ajoutez d’abord le site à votre écran d’accueil.
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-stone-600">
            {status === "enabled"
              ? "Notifications activées sur cet appareil."
              : "Recevez les rappels et annonces importantes directement sur cet appareil."}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={status === "enabled" ? handleDisable : handleEnable}
            className={
              status === "enabled"
                ? "shrink-0 rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 disabled:opacity-60"
                : "shrink-0 rounded-lg border-2 border-black bg-brand-yellow px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-brand-yellow-dark disabled:opacity-60"
            }
          >
            {busy ? "…" : status === "enabled" ? "Désactiver" : "Activer"}
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
