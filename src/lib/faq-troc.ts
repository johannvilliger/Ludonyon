export type QuestionFrequente = { question: string; reponse: string };

// Pas de dates en dur : les dates précises changent à chaque édition et
// sont déjà communiquées par email (confirmation, rappel de restitution) —
// ici on ne répond qu'aux questions qui restent vraies d'une édition à
// l'autre.
//
// Liste partagée entre la page "comment ça marche" (liste complète) et le
// widget AssistantTroc (les premières, en aperçu rapide) — une seule source
// pour ne pas désynchroniser les réponses.
export const QUESTIONS_FREQUENTES: QuestionFrequente[] = [
  {
    question: "Combien d'articles puis-je déposer ?",
    reponse: "30 articles maximum par vendeur.",
  },
  {
    question: "Quels objets ne sont pas acceptés ?",
    reponse: "Les peluches, DVD, CD et VHS ne sont pas admis au troc.",
  },
  {
    question: "Dans quel état doivent être mes objets ?",
    reponse: "Propres, complets, en bon état, et bien attachés ou emballés (pièces détachées fixées).",
  },
  {
    question: "Quels sont les frais ?",
    reponse:
      "10% sont retenus sur le prix de vente pour le vendeur, et 10% sont ajoutés au prix affiché pour l'acheteur.",
  },
  {
    question: "Puis-je modifier ma liste après l'avoir envoyée ?",
    reponse:
      "Oui, via le lien reçu par email au moment du dépôt, jusqu'à la veille du jour de dépôt en personne.",
  },
  {
    question: "Comment récupérer l'argent de mes ventes ?",
    reponse:
      "Lors de la restitution, le jour indiqué par email, en présentant votre QR code (le même qu'au dépôt).",
  },
  {
    question: "Que deviennent mes invendus ?",
    reponse: "Vous pouvez les reprendre lors de la restitution, ou les laisser en don pour des associations.",
  },
  {
    question: "Comment payer le jour de la vente, en tant qu'acheteur ?",
    reponse: "Uniquement en espèces (cash) — aucun autre moyen de paiement n'est accepté sur place.",
  },
  {
    question: "J'ai perdu mon numéro de vendeur ou mon QR code, que faire ?",
    reponse:
      "Retrouvez-les dans l'email de confirmation reçu au dépôt de votre liste, ou contactez-nous directement.",
  },
];

// Aperçu affiché directement dans le widget AssistantTroc, avant le chat —
// les autres restent consultables sur /comment-ca-marche.
export const FAQ_RAPIDE = QUESTIONS_FREQUENTES.slice(0, 4);
