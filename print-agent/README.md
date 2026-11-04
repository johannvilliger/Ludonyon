# print-agent

Petit programme Windows qui imprime, sans intervention manuelle, sur une ou
deux imprimantes centralisées :

- les tickets papier de caisse (case "Ticket papier" à l'encaissement), sur
  une imprimante à étiquettes continue (Brother QL-820NWB ou équivalent) ;
- les feuilles d'étiquettes articles (bouton "Envoyer à l'impression
  centralisée" sur `/accueil/vendeur/[code]/etiquettes`), sur une imprimante
  A4 chargée avec la planche adhésive Herma 4357.

Il ne fait pas partie du site — c'est un programme séparé, à faire tourner
sur le(s) ordinateur(s) Windows branché(s) (réseau ou USB) à ces imprimantes.
Les deux flux sont indépendants : un même poste peut gérer les deux
imprimantes, ou deux postes séparés peuvent chacun n'en gérer qu'une (voir
`printerName` / `printerNameEtiquettes` dans la configuration).

## Comment ça marche

### Tickets de caisse

1. À l'encaissement, si "Ticket papier" est coché, le site dépose un ticket
   dans une file d'attente en base (table `etiquettes_impression`).
2. Ce programme interroge le site toutes les quelques secondes
   (`GET /api/etiquettes/en-attente`), génère chaque ticket en PDF (logo,
   n° caisse, articles, 10%, total) et l'envoie directement à l'imprimante
   installée sous Windows — sans boîte de dialogue.
3. Il informe le site que le ticket est imprimé (ou en échec)
   (`POST /api/etiquettes/[id]/statut`).

### Étiquettes articles

1. Depuis `/accueil/vendeur/[code]/etiquettes`, le bouton "Envoyer à
   l'impression centralisée" dépose la feuille (coordonnées + articles,
   copies et étiquettes "texte seul" déjà calculées) dans une file d'attente
   séparée (table `etiquettes_articles_impression`).
2. Ce programme l'interroge aussi (`GET /api/etiquettes-articles/en-attente`),
   régénère la feuille en PDF (une page A4 par planche de 40, grille 4×10
   calquée au mm près sur `src/app/globals.css` — voir `src/etiquettes-pdf.js`)
   et l'imprime, toujours sans boîte de dialogue.
3. Il informe le site du résultat (`POST /api/etiquettes-articles/[id]/statut`).

**⚠️ Vérification physique obligatoire avant usage en conditions réelles** :
contrairement à un ticket (papier continu bon marché, une impression ratée
se réimprime sans conséquence), une feuille d'étiquettes s'imprime sur une
planche adhésive à positions fixes. Un décalage de marge non détecté gâche
une feuille de 40 étiquettes d'un coup. Avant de faire confiance à ce flux
le jour J, imprimer au moins une feuille de test sur une vraie planche et
vérifier au mm que chaque étiquette tombe bien dans sa case — l'aperçu
navigateur (impression classique, toujours disponible en parallèle) reste
le moyen de vérifier visuellement avant d'imprimer si un doute subsiste.

Dans les deux cas, le site n'a besoin d'aucun accès au réseau local de la
salle : c'est ce programme qui va chercher le travail, comme un navigateur.

## Installation (une fois, sur chaque PC près d'une imprimante)

1. Installer l'imprimante normalement dans Windows (pilote officiel du
   fabricant), et noter son nom exact tel qu'il apparaît dans "Imprimantes
   et scanners" (ex. `Brother QL-820NWB`, ou le nom de l'imprimante A4 de
   l'accueil).
2. Copier `config.example.json` vers `config.json`, à côté de
   `print-agent.exe`, et remplir :
   - `siteUrl` : l'adresse du site (celle de test pendant les essais, celle
     de prod une fois migré).
   - `codeImpression` : le code affiché dans le dashboard, section
     "Impression des tickets (print-agent)" — le même code sert pour les
     deux flux (tickets et étiquettes).
   - `printerName` : le nom exact de l'imprimante à tickets (laisser vide,
     `""`, si ce poste ne gère que les étiquettes).
   - `printerNameEtiquettes` : le nom exact de l'imprimante A4 de l'accueil
     (laisser vide si ce poste ne gère que les tickets).
   - `pollIntervalMs` : fréquence de vérification en millisecondes
     (5000 = 5 secondes, largement suffisant).
   - `longueurMaxMm` : DOIT être identique à "Longueur" dans les
     préférences d'impression Windows de l'imprimante (onglet "De base",
     format du papier). Le pilote imprime toujours à cette longueur fixe
     (il ne l'ajuste jamais au contenu, ni ne rogne l'excédent en dehors
     de P-touch Editor) — un ticket plus long est donc découpé par
     print-agent lui-même en plusieurs bandes successives ("suite 2/3"…)
     plutôt que d'être tronqué de façon incontrôlée par le pilote. 150mm
     par défaut si absent.
3. Double-cliquer sur `print-agent.exe`. Une fenêtre de console reste
   ouverte et affiche chaque ticket imprimé — la laisser tourner pendant
   tout le troc.

## Construire le .exe depuis les sources

```
cd print-agent
npm install
npm run build:exe
```

Le fichier `dist/print-agent.exe` est généré — le copier avec
`config.example.json` (renommé en `config.json` et rempli) sur le PC
d'impression.

## Tester sans l'imprimante physique

```
npm start
```

lance le programme directement avec Node (mêmes prérequis : `config.json`
rempli) — utile pour vérifier que la connexion au site et la génération du
PDF fonctionnent avant de passer par le `.exe`. Sans imprimante Windows
disponible, l'étape d'impression échoue normalement (le ticket reste marqué
"echec", visible sur `/gestion/dashboard`) ; tout le reste du programme
(récupération des tickets, génération du PDF) peut se vérifier séparément.
