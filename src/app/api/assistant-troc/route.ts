import { NextResponse, type NextRequest } from "next/server";
import { ipAppelante } from "@/lib/rate-limit";
import { limiteMessagesDepassee } from "@/lib/chat-rate-limit";
import { repondreQuestionTroc, type MessageAssistant } from "@/lib/assistant-troc";

const MAX_MESSAGES_CONVERSATION = 12;
const MAX_LONGUEUR_MESSAGE = 500;

function messageValide(m: unknown): m is MessageAssistant {
  return (
    typeof m === "object" &&
    m !== null &&
    ((m as MessageAssistant).role === "user" || (m as MessageAssistant).role === "assistant") &&
    typeof (m as MessageAssistant).content === "string" &&
    (m as MessageAssistant).content.length > 0 &&
    (m as MessageAssistant).content.length <= MAX_LONGUEUR_MESSAGE
  );
}

// Point public appelant un modèle payant : quota par IP (voir
// chat-rate-limit.ts) avant même de lire le corps, pour ne jamais faire
// l'appel Anthropic au-delà du quota.
export async function POST(request: NextRequest) {
  const ip = await ipAppelante();
  if (limiteMessagesDepassee(ip)) {
    return NextResponse.json({ erreur: "Trop de messages envoyés — réessayez dans un moment." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  }

  const messages = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES_CONVERSATION) {
    return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  }
  if (!messages.every(messageValide)) {
    return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  }

  try {
    const reponse = await repondreQuestionTroc(messages);
    return NextResponse.json({ reponse });
  } catch (err) {
    console.error("Échec de l'assistant troc :", err);
    return NextResponse.json({ erreur: "Désolé, une erreur est survenue — réessayez plus tard." }, { status: 500 });
  }
}
