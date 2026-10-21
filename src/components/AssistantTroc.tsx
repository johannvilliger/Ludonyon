"use client";

import { useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

export function AssistantTroc() {
  const [ouvert, setOuvert] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [saisie, setSaisie] = useState("");
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer() {
    const texte = saisie.trim();
    if (!texte || pending) return;

    setErreur(null);
    const nouveaux: Message[] = [...messages, { role: "user", content: texte }];
    setMessages(nouveaux);
    setSaisie("");
    setPending(true);

    try {
      const reponse = await fetch("/api/assistant-troc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nouveaux }),
      });
      const donnees = await reponse.json();
      if (!reponse.ok) throw new Error(donnees.erreur || "Échec de la requête.");
      setMessages((prev) => [...prev, { role: "assistant", content: donnees.reponse }]);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Échec de l'envoi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 print:hidden">
      {ouvert && (
        <div className="mb-2 flex h-96 w-80 max-w-[calc(100vw-2rem)] flex-col rounded-lg border border-zinc-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2">
            <span className="text-sm font-medium text-zinc-800">Une question ?</span>
            <button
              type="button"
              onClick={() => setOuvert(false)}
              className="text-zinc-400 hover:text-zinc-600"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {messages.length === 0 && (
              <p className="text-sm text-zinc-500">
                Posez une question sur le dépôt, les frais, les dates, la restitution… Je ne réponds
                qu&apos;aux questions sur le fonctionnement du troc.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                <span
                  className={`inline-block max-w-[85%] rounded-lg px-3 py-1.5 text-sm ${
                    m.role === "user" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-800"
                  }`}
                >
                  {m.content}
                </span>
              </div>
            ))}
            {pending && <p className="text-sm text-zinc-400">…</p>}
            {erreur && <p className="text-sm text-red-600">{erreur}</p>}
          </div>

          <div className="flex gap-2 border-t border-zinc-200 p-2">
            <input
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") envoyer();
              }}
              placeholder="Votre question…"
              className="min-w-0 flex-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={envoyer}
              disabled={pending || !saisie.trim()}
              className="shrink-0 rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              →
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-xl text-white shadow-lg hover:bg-zinc-800"
        aria-label="Poser une question sur le troc"
      >
        💬
      </button>
    </div>
  );
}
