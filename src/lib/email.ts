import "server-only";
import nodemailer from "nodemailer";
import QRCode from "qrcode";
import { CONDITIONS_TROC } from "./conditions";

let transporteur: nodemailer.Transporter | null = null;

// Le nom du vendeur est une donnée saisie par le public, injectée telle
// quelle dans un email HTML — sans échappement, un nom contenant du HTML/JS
// (ex. "<img src=x onerror=...>") s'exécuterait dans le client mail du
// destinataire.
function echapperHtml(valeur: string): string {
  return valeur
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Fonctionnalité optionnelle, comme la classification IA (voir
// .env.local.example) : sans identifiants SMTP configurés, on log juste un
// avertissement plutôt que de faire planter la soumission de liste — un
// vendeur ne doit jamais perdre sa liste à cause d'un email qui échoue.
function getTransporteur(): nodemailer.Transporter | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) return null;

  if (!transporteur) {
    transporteur = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT ? Number(SMTP_PORT) : 587,
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    });
  }
  return transporteur;
}

// Adresse de l'admin à prévenir en cas de blocage brute-force — surchargeable
// via env si besoin, mais fonctionne sans configuration supplémentaire.
const EMAIL_ADMIN = process.env.ADMIN_EMAIL || "johannvilliger@ludonyonregion.ch";

export async function envoyerAlerteBruteForce(params: {
  ip: string;
  formulaire: string;
  dureeMinutes: number;
}): Promise<void> {
  const transport = getTransporteur();
  if (!transport) {
    console.warn("SMTP non configuré — alerte brute-force non envoyée (voir logs serveur).");
    return;
  }

  try {
    await transport.sendMail({
      from: {
        name: "Troc - Ludothèque Nyon Région",
        address: process.env.SMTP_FROM || process.env.SMTP_USER || "",
      },
      to: EMAIL_ADMIN,
      subject: `Troc — blocage brute-force (${params.formulaire})`,
      html: `
        <p>Une adresse IP a été bloquée après trop de tentatives de connexion échouées.</p>
        <ul>
          <li><strong>Formulaire :</strong> ${echapperHtml(params.formulaire)}</li>
          <li><strong>IP :</strong> ${echapperHtml(params.ip)}</li>
          <li><strong>Durée du blocage :</strong> ${params.dureeMinutes} minute(s)</li>
          <li><strong>Date :</strong> ${new Date().toLocaleString("fr-CH")}</li>
        </ul>
      `,
    });
  } catch (err) {
    console.error("Échec de l'envoi de l'alerte brute-force :", err);
  }
}

export async function envoyerEmailConfirmationListe(params: {
  destinataire: string;
  nomVendeur: string;
  numeroVendeur: number;
  codeConfirmation: string;
  lienConfirmation: string;
  lienModifier: string;
  tauxAchat: number;
  tauxVendeur: number;
}): Promise<void> {
  const transport = getTransporteur();
  if (!transport) {
    console.warn("SMTP non configuré (voir .env.local.example) — email de confirmation non envoyé.");
    return;
  }

  const qrBuffer = await QRCode.toBuffer(params.codeConfirmation, { margin: 1, width: 220 });
  const pourcentAchat = Math.round(params.tauxAchat * 100);
  const pourcentVendeur = Math.round(params.tauxVendeur * 100);

  try {
    await transport.sendMail({
      from: {
        name: "Troc - Ludothèque Nyon Région",
        address: process.env.SMTP_FROM || process.env.SMTP_USER || "",
      },
      to: params.destinataire,
      subject: `Confirmation — vendeur n° ${params.numeroVendeur}`,
      html: `
        <p>Bonjour ${echapperHtml(params.nomVendeur)},</p>
        <p>Votre liste a bien été enregistrée pour le troc de la ludothèque.</p>
        <p><strong>Vous êtes le vendeur n° ${params.numeroVendeur}</strong>.</p>
        <p>Présentez ce code (ou le QR ci-dessous) au dépôt :</p>
        <p style="font-family: monospace; font-size: 1.1em;">${params.codeConfirmation}</p>
        <p><img src="cid:qr-confirmation" alt="QR de confirmation" width="180" height="180" /></p>
        <p><a href="${params.lienConfirmation}">Voir ma liste et mon code</a></p>
        <p><a href="${params.lienModifier}">Modifier ma liste</a> (possible jusqu'à la veille de la date de dépôt des articles).</p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #ddd;" />
        <p style="font-size: 0.9em; color: #444;">
          Afin de couvrir les frais de fonctionnement du troc, ${pourcentAchat}% sont ajoutés au prix de
          vente, pour l'acheteur. ${pourcentVendeur}% sont soustraits au prix de vente pour le vendeur.
        </p>
        <p style="font-size: 0.9em; color: #444;">${CONDITIONS_TROC}</p>
      `,
      attachments: [
        {
          filename: "qr-confirmation.png",
          content: qrBuffer,
          cid: "qr-confirmation",
        },
      ],
    });
  } catch (err) {
    console.error("Échec de l'envoi de l'email de confirmation :", err);
  }
}
