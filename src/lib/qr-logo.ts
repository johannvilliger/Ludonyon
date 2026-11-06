import "server-only";
import { readFile } from "fs/promises";
import path from "path";
import QRCode from "qrcode";

// Incruste le meeple de la ludo au centre d'un QR code — purement cosmétique,
// réservé aux QR "de confort" (lien d'accès accueil/caisse à scanner une
// fois ou cliquer en bookmark). Jamais sur un QR scanné en rafale au
// checkout (étiquettes articles, confirmation vendeur) : le logo mange de
// la marge d'erreur, un risque inutile sur un flux critique le jour J.
//
// Technique : on génère le QR en SVG (errorCorrectionLevel "H" — tolère
// jusqu'à ~30% de modules masqués) puis on insère l'image en <image> SVG,
// sans dépendance de composition d'image (canvas/sharp) côté serveur.

let logoDataUriCache: string | null = null;

async function logoDataUri(): Promise<string> {
  if (logoDataUriCache) return logoDataUriCache;
  const buffer = await readFile(path.join(process.cwd(), "public", "meeple.png"));
  logoDataUriCache = `data:image/png;base64,${buffer.toString("base64")}`;
  return logoDataUriCache;
}

export async function qrAvecLogoDataUrl(texte: string, tailleAffichagePx = 220): Promise<string> {
  const svg = await QRCode.toString(texte, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 1,
    width: tailleAffichagePx,
  });

  const viewBox = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  const taille = viewBox ? Number(viewBox[1]) : 29;

  const logo = await logoDataUri();
  const logoTaille = taille * 0.22;
  const posLogo = (taille - logoTaille) / 2;
  const fondTaille = logoTaille * 1.2;
  const posFond = (taille - fondTaille) / 2;

  const incrustation =
    `<rect x="${posFond}" y="${posFond}" width="${fondTaille}" height="${fondTaille}" ` +
    `rx="${fondTaille * 0.18}" fill="#ffffff"/>` +
    `<image x="${posLogo}" y="${posLogo}" width="${logoTaille}" height="${logoTaille}" ` +
    `href="${logo}" preserveAspectRatio="xMidYMid meet"/>`;

  const svgAvecLogo = svg.replace("</svg>", `${incrustation}</svg>`);
  return `data:image/svg+xml;base64,${Buffer.from(svgAvecLogo).toString("base64")}`;
}
