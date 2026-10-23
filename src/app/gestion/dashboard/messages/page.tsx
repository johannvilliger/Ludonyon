import { redirect } from "next/navigation";
import Link from "next/link";
import { query } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";
import { TraiteToggle } from "./traite-toggle";

export const dynamic = "force-dynamic";

type MessageLigne = {
  id: string;
  nom: string;
  telephone: string;
  email: string;
  message: string;
  traite: number;
  created_at: string;
};

export default async function MessagesPage() {
  if (!(await dashboardEstConnecte())) redirect("/gestion");

  const messages = await query<MessageLigne>(
    "SELECT id, nom, telephone, email, message, traite, created_at FROM messages_assistant ORDER BY traite ASC, created_at DESC",
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      {/* prefetch désactivé : le dashboard prérécupéré au survol/affichage de
          ce lien figerait le badge "Messages" (nombre de non traités) à sa
          valeur d'avant qu'on marque un message traité sur cette page même —
          revalidatePath() ne force pas le client à rejeter un payload déjà
          préchargé. */}
      <Link href="/gestion/dashboard" prefetch={false} className="text-sm text-zinc-500 hover:underline">
        ← Dashboard
      </Link>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Messages du widget</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Questions laissées via « Je ne trouve pas la réponse à ma question » sur le widget d&apos;aide — l&apos;appel à
        Claude y est désactivé pour le moment, donc toute question hors FAQ atterrit ici.
      </p>

      {messages.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">Aucun message pour le moment.</p>
      ) : (
        <ul className="mt-8 divide-y divide-zinc-200 rounded-md border border-zinc-200">
          {messages.map((m) => (
            <li key={m.id} className={`px-4 py-3 ${m.traite ? "bg-white" : "bg-amber-50"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-medium text-zinc-900">{m.nom}</span>{" "}
                  <span className="text-sm text-zinc-500">
                    — {m.telephone} · {m.email}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">
                    {new Date(m.created_at).toLocaleString("fr-CH", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                  <TraiteToggle messageId={m.id} traite={Boolean(m.traite)} />
                </div>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-zinc-700">{m.message}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
