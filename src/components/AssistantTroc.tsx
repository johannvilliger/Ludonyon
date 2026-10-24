"use client";

import { useActionState, useEffect, useState } from "react";
import Image from "next/image";
import { FAQ_RAPIDE, trouverReponseFaq } from "@/lib/faq-troc";
import { envoyerMessageSansReponse, type EnvoiMessageState } from "@/lib/messages-sans-reponse";
import { formaterTelephone } from "@/lib/telephone";

type Message = { role: "user" | "assistant"; content: string };

const initialState: EnvoiMessageState = { error: null, envoye: false };

// Premier message affiché à l'ouverture, avant toute saisie — pour que le
// widget ne s'ouvre jamais sur une zone de chat vide et silencieuse.
// Volontairement hors de l'état `messages` (qui part de Claude de son côté
// de la conversation) : l'API Anthropic exige que le premier message d'une
// conversation ait le rôle "user", donc ce message d'accueil ne doit jamais
// être envoyé dans le payload de /api/assistant-troc.
const MESSAGE_ACCUEIL = "Bonjour ! N'hésitez pas à me poser vos questions sur le troc — dépôt, frais, dates, restitution…";

// Texte de la bulle qui invite à ouvrir le widget, affichée quelques
// secondes après l'arrivée sur la page plutôt que d'ouvrir le panneau tout
// de suite (moins intrusif qu'une ouverture automatique).
const MESSAGE_TEASER = "Une question ? N'hésitez pas, je suis là pour vous aider !";
const DELAI_TEASER_MS = 5_000;

export function AssistantTroc() {
  const [ouvert, setOuvert] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [saisie, setSaisie] = useState("");
  const [pendingClaude, setPendingClaude] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // Formulaire de secours — rejoint soit via le lien "Laisser un message",
  // soit automatiquement si l'appel à Claude échoue (voir le catch
  // ci-dessous).
  const [modeContact, setModeContact] = useState(false);
  const [messageContact, setMessageContact] = useState("");
  const [telephone, setTelephone] = useState("");
  const [state, formAction, pending] = useActionState(envoyerMessageSansReponse, initialState);

  useEffect(() => {
    const minuteur = setTimeout(() => setTeaser(true), DELAI_TEASER_MS);
    return () => clearTimeout(minuteur);
  }, []);

  function ouvrir() {
    setTeaser(false);
    setOuvert(true);
  }

  async function envoyer() {
    const texte = saisie.trim();
    if (!texte || pendingClaude) return;

    setErreur(null);
    const nouveaux: Message[] = [...messages, { role: "user", content: texte }];
    setMessages(nouveaux);
    setSaisie("");

    // Réponse instantanée si la question matche une entrée de la FAQ —
    // aucune requête réseau, aucun appel à Claude.
    const reponseFaq = trouverReponseFaq(texte);
    if (reponseFaq) {
      setMessages((prev) => [...prev, { role: "assistant", content: reponseFaq.reponse }]);
      return;
    }

    setPendingClaude(true);
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
      setMessageContact(texte);
    } finally {
      setPendingClaude(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end print:hidden">
      {ouvert && (
        <div className="mb-2.5 flex h-[26rem] w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2.5">
            <Image src="/meeple.png" alt="" width={24} height={24} />
            <span className="flex-1 text-sm font-semibold text-zinc-800">Une question ?</span>
            <button
              type="button"
              onClick={() => setOuvert(false)}
              className="text-zinc-400 hover:text-zinc-600"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          {!modeContact ? (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Questions fréquentes
                </p>
                <div className="divide-y divide-zinc-100">
                  {FAQ_RAPIDE.map((q) => (
                    <details key={q.question} className="py-2 first:pt-0">
                      <summary className="cursor-pointer list-none text-sm font-medium text-zinc-700 marker:content-none">
                        {q.question}
                      </summary>
                      <p className="mt-1.5 text-sm text-zinc-500">{q.reponse}</p>
                    </details>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Pas trouvé votre réponse ?
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setMessageContact("");
                      setModeContact(true);
                    }}
                    className="text-xs font-medium text-zinc-500 underline hover:text-zinc-700"
                  >
                    Laisser un message
                  </button>
                </div>

                <div className="text-left">
                  <span className="inline-block max-w-[85%] rounded-lg bg-zinc-100 px-3 py-1.5 text-sm text-zinc-800">
                    {MESSAGE_ACCUEIL}
                  </span>
                </div>
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
                {pendingClaude && <p className="text-sm text-zinc-400">…</p>}
                {erreur && (
                  <p className="text-sm text-red-600">
                    {erreur}{" "}
                    <button
                      type="button"
                      onClick={() => setModeContact(true)}
                      className="underline hover:text-red-700"
                    >
                      Laisser un message à la place ?
                    </button>
                  </p>
                )}
              </div>

              <div className="flex gap-2 border-t border-zinc-200 p-2">
                <input
                  value={saisie}
                  onChange={(e) => setSaisie(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") envoyer();
                  }}
                  placeholder="Posez votre question…"
                  className="min-w-0 flex-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={envoyer}
                  disabled={pendingClaude || !saisie.trim()}
                  className="shrink-0 rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  →
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-3">
              {state.envoye ? (
                <div className="space-y-3 text-center">
                  <p className="text-sm font-medium text-zinc-800">Message envoyé !</p>
                  <p className="text-sm text-zinc-500">
                    Le comité vous répondra directement par téléphone ou par email.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setModeContact(false);
                      setMessageContact("");
                      setTelephone("");
                    }}
                    className="text-xs font-medium text-zinc-500 underline hover:text-zinc-700"
                  >
                    ← Retour
                  </button>
                </div>
              ) : (
                <form action={formAction} className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setModeContact(false)}
                    className="text-xs font-medium text-zinc-500 underline hover:text-zinc-700"
                  >
                    ← Retour
                  </button>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Je ne trouve pas la réponse à ma question
                  </p>

                  {/* Honeypot anti-spam : voir vendeur/nouveau/nouvelle-liste-form.tsx */}
                  <input
                    type="text"
                    name="site_web"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
                  />

                  <label className="block">
                    <span className="text-xs font-medium text-zinc-700">Nom</span>
                    <input
                      name="nom"
                      required
                      className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-zinc-700">Téléphone</span>
                    <input
                      name="telephone"
                      type="tel"
                      value={telephone}
                      onChange={(e) => setTelephone(formaterTelephone(e.target.value))}
                      placeholder="079 123 45 67"
                      required
                      className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-zinc-700">Email</span>
                    <input
                      name="email"
                      type="email"
                      required
                      className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-zinc-700">Votre question</span>
                    <textarea
                      name="message"
                      required
                      rows={3}
                      value={messageContact}
                      onChange={(e) => setMessageContact(e.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </label>

                  {state.error && <p className="text-sm text-red-600">{state.error}</p>}

                  <button
                    type="submit"
                    disabled={pending}
                    className="w-full rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {pending ? "Envoi…" : "Envoyer ma question"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {!ouvert && teaser && (
        <div className="relative mb-2.5 max-w-[220px] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 shadow-lg after:absolute after:-bottom-[6px] after:right-5 after:h-3 after:w-3 after:rotate-45 after:border-b after:border-r after:border-zinc-200 after:bg-white after:content-['']">
          <button
            type="button"
            onClick={() => setTeaser(false)}
            aria-label="Ignorer"
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-zinc-200 bg-white text-xs text-zinc-400 hover:text-zinc-600"
          >
            ✕
          </button>
          <button type="button" onClick={ouvrir} className="text-left">
            {MESSAGE_TEASER}
          </button>
        </div>
      )}

      {/* FAB en forme de bulle de BD (coin arrondi + pointe triangulaire)
          avec le meeple centré dedans, comme sur le reste du site. */}
      <button
        type="button"
        onClick={() => (ouvert ? setOuvert(false) : ouvrir())}
        aria-label="Poser une question sur le troc"
        className="relative flex h-[60px] w-[60px] items-center justify-center rounded-[18px] border border-zinc-200 bg-white shadow-lg after:absolute after:-bottom-[7px] after:right-3.5 after:h-4 after:w-4 after:rotate-45 after:rounded-br-sm after:border-b after:border-r after:border-zinc-200 after:bg-white after:content-['']"
      >
        <Image src="/meeple.png" alt="" width={38} height={38} />
      </button>
    </div>
  );
}
