export type QuestionFrequente = {
  question: string;
  reponse: string;
  // Expressions qui, si elles apparaissent dans la question posée, indiquent
  // qu'elle correspond à cette entrée (voir trouverReponseFaq) — permet de
  // répondre sans appeler Claude quand la réponse est déjà connue.
  motsCles: string[];
};

// Pas de dates en dur : les dates précises changent à chaque édition et
// sont déjà communiquées par email (confirmation, rappel de restitution) —
// ici on ne répond qu'aux questions qui restent vraies d'une édition à
// l'autre.
//
// Liste partagée entre la page "comment ça marche" (liste complète), le
// widget AssistantTroc (les premières, en aperçu rapide) et le filtre par
// mots-clés de l'assistant conversationnel — une seule source pour ne pas
// désynchroniser les réponses.
export const QUESTIONS_FREQUENTES: QuestionFrequente[] = [
  {
    question: "Combien d'articles puis-je déposer ?",
    reponse: "30 articles maximum par vendeur.",
    motsCles: [
      "combien d'articles",
      "combien de jouets",
      "combien de jeux",
      "combien d'objets",
      "nombre d'articles",
      "limite d'articles",
      "maximum d'articles",
      "30 articles",
      "trop d'articles",
    ],
  },
  {
    question: "Quels objets ne sont pas acceptés ?",
    reponse: "Les peluches, DVD, CD et VHS ne sont pas admis au troc.",
    motsCles: [
      "objets refusés",
      "objets interdits",
      "pas accepté",
      "pas acceptés",
      "peluche",
      "dvd",
      "cd",
      "vhs",
      "quoi déposer",
      "quels jouets",
      "quels objets",
    ],
  },
  {
    question: "Dans quel état doivent être mes objets ?",
    reponse: "Propres, complets, en bon état, et bien attachés ou emballés (pièces détachées fixées).",
    motsCles: [
      "quel état",
      "état des objets",
      "état des jouets",
      "propreté",
      "complet",
      "pièces manquantes",
      "abîmé",
      "en bon état",
    ],
  },
  {
    question: "Quels sont les frais ?",
    reponse:
      "10% sont retenus sur le prix de vente pour le vendeur, et 10% sont ajoutés au prix affiché pour l'acheteur.",
    motsCles: [
      "frais",
      "commission",
      "pourcentage",
      "combien ça coûte",
      "ça coûte combien",
      "10%",
      "10 pourcent",
    ],
  },
  {
    question: "Puis-je modifier ma liste après l'avoir envoyée ?",
    reponse:
      "Oui, via le lien reçu par email au moment du dépôt, jusqu'à la veille du jour de dépôt en personne.",
    motsCles: [
      "modifier ma liste",
      "changer ma liste",
      "corriger ma liste",
      "ajouter un article",
      "liste envoyée",
      "modifier après",
      "modifier ma soumission",
    ],
  },
  {
    question: "Comment récupérer l'argent de mes ventes ?",
    reponse:
      "Lors de la restitution, en fin d'après-midi après la vente (horaire précis communiqué par email et sur le site le moment venu), en présentant votre QR code (le même qu'au dépôt).",
    motsCles: [
      "récupérer l'argent",
      "récupérer mes ventes",
      "argent de mes ventes",
      "recevoir l'argent",
      "paiement vendeur",
      "restitution argent",
      "quand je touche l'argent",
    ],
  },
  {
    question: "Que deviennent mes invendus ?",
    reponse: "Vous pouvez les reprendre lors de la restitution, ou les laisser en don pour des associations.",
    motsCles: ["invendus", "pas vendu", "récupérer mes invendus", "articles non vendus", "objets non vendus"],
  },
  {
    question: "Comment payer le jour de la vente, en tant qu'acheteur ?",
    reponse: "Uniquement en espèces (cash) — aucun autre moyen de paiement n'est accepté sur place.",
    motsCles: ["comment payer", "moyen de paiement", "carte bancaire", "twint", "espèces", "cash"],
  },
  {
    question: "J'ai perdu mon numéro de vendeur ou mon QR code, que faire ?",
    reponse:
      "Retrouvez-les dans l'email de confirmation reçu au dépôt de votre liste, ou contactez-nous directement.",
    motsCles: [
      "perdu mon numéro",
      "perdu mon qr",
      "retrouver mon numéro",
      "retrouver le qr code",
      "numéro de vendeur perdu",
      "plus mon numéro",
    ],
  },
  {
    question: "Dois-je imprimer et coller mes propres étiquettes ?",
    reponse:
      "Non — remplissez votre liste en ligne, c'est nous qui imprimons et posons les étiquettes sur vos articles au moment du dépôt.",
    motsCles: ["étiquette", "étiquettes", "imprimer les étiquettes", "coller les étiquettes", "dois-je imprimer"],
  },
  {
    question: "Comment je me connecte en tant que bénévole ?",
    reponse:
      "Contactez le comité par email (info) ou via le groupe WhatsApp des bénévoles pour recevoir vos instructions de connexion.",
    motsCles: [
      "connexion bénévole",
      "me connecter bénévole",
      "accès bénévole",
      "code bénévole",
      "comment je me connecte",
    ],
  },
  {
    question: "Quels sont les avantages à aider comme bénévole ?",
    reponse:
      "Aucune commission de 10% n'est retenue, ni comme vendeur ni comme acheteur. Intéressé·e ? Contactez le comité par email.",
    motsCles: [
      "avantage bénévole",
      "pourquoi devenir bénévole",
      "devenir bénévole",
      "aider comme bénévole",
      "pas de commission bénévole",
    ],
  },
  {
    question: "Je ne suis pas disponible le jour de la restitution, que faire ?",
    reponse:
      "Vous pouvez mandater une autre personne pour venir récupérer vos invendus et votre argent à votre place (avec votre QR code), ou nous contacter à l'avance pour en discuter.",
    motsCles: [
      "pas disponible restitution",
      "absent restitution",
      "pas dispo restitution",
      "quelqu'un d'autre peut venir",
      "mandater quelqu'un",
      "envoyer quelqu'un à ma place",
    ],
  },
];

// Aperçu affiché directement dans le widget AssistantTroc, avant le chat —
// les autres restent consultables sur /comment-ca-marche.
export const FAQ_RAPIDE = QUESTIONS_FREQUENTES.slice(0, 4);

function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9%\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Découpe en mots, en ignorant les résidus d'élision ("l'", "d'", "j'" → "l",
// "d", "j" une fois l'apostrophe retirée) — sans ça, un mot-clé comme
// "récupérer l'argent" exigerait littéralement le mot "l" dans la question,
// ce qu'une reformulation parfaitement valide ("récupérer MON argent") n'a
// aucune raison de contenir.
function mots(texte: string): string[] {
  return normaliser(texte)
    .split(" ")
    .filter((m) => m.length > 1);
}

// Deux mots sont "proches" s'ils sont identiques, ou si le plus court est un
// préfixe du plus long (au moins 4 lettres, pour éviter qu'un mot-clé court
// comme "cd" ou "qr" ne matche n'importe quoi) — couvre singulier/pluriel
// ("peluche" / "peluches") et les conjugaisons usuelles ("déposer" /
// "dépose") sans avoir à lister chaque variante dans motsCles.
function motsProches(a: string, b: string): boolean {
  if (a === b) return true;
  const [court, long] = a.length <= b.length ? [a, b] : [b, a];
  return court.length >= 4 && long.startsWith(court);
}

// Filtre par mots-clés utilisé avant d'appeler Claude (côté client ET côté
// serveur, voir assistant-troc.ts) : si tous les mots d'une expression connue
// d'une entrée de la FAQ apparaissent (ou ont un mot proche) dans la question
// posée, dans n'importe quel ordre, on répond directement avec sa réponse
// toute faite plutôt que de dépenser un appel au modèle payant.
// Volontairement simple (pas d'IA, pas de recherche floue) — un faux négatif
// (question reformulée non reconnue) retombe sans dommage sur l'appel à
// Claude habituel ; un faux positif est peu probable vu la spécificité des
// mots-clés choisis.
export function trouverReponseFaq(message: string): QuestionFrequente | null {
  const motsMessage = mots(message);
  if (motsMessage.length === 0) return null;

  let meilleure: { question: QuestionFrequente; occurrences: number } | null = null;
  for (const q of QUESTIONS_FREQUENTES) {
    const occurrences = q.motsCles.filter((mc) => {
      const motsCle = mots(mc);
      return motsCle.length > 0 && motsCle.every((mCle) => motsMessage.some((mMsg) => motsProches(mCle, mMsg)));
    }).length;
    if (occurrences > 0 && (!meilleure || occurrences > meilleure.occurrences)) {
      meilleure = { question: q, occurrences };
    }
  }
  return meilleure?.question ?? null;
}
