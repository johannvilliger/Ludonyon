# print-agent

Petit programme Windows qui imprime les tickets papier de caisse (case
"Ticket papier" à l'encaissement) sur une imprimante à étiquettes centralisée
(Brother QL-820NWB ou équivalent), sans intervention manuelle.

Il ne fait pas partie du site — c'est un programme séparé, à faire tourner
sur UN SEUL ordinateur Windows, celui branché (réseau ou USB) à
l'imprimante.

## Comment ça marche

1. À l'encaissement, si "Ticket papier" est coché, le site dépose un ticket
   dans une file d'attente en base (table `etiquettes_impression`).
2. Ce programme interroge le site toutes les quelques secondes
   (`GET /api/etiquettes/en-attente`), génère chaque ticket en PDF (logo,
   n° caisse, articles, 10%, total) et l'envoie directement à l'imprimante
   installée sous Windows — sans boîte de dialogue.
3. Il informe le site que le ticket est imprimé (ou en échec)
   (`POST /api/etiquettes/[id]/statut`).

Le site n'a besoin d'aucun accès au réseau local de la salle : c'est ce
programme qui va chercher le travail, comme un navigateur.

## Installation (une fois, sur le PC près de l'imprimante)

1. Installer l'imprimante Brother QL-820NWB normalement dans Windows
   (pilote officiel Brother), et noter son nom exact tel qu'il apparaît
   dans "Imprimantes et scanners" (ex. `Brother QL-820NWB`).
2. Copier `config.example.json` vers `config.json`, à côté de
   `print-agent.exe`, et remplir :
   - `siteUrl` : l'adresse du site (celle de test pendant les essais, celle
     de prod une fois migré).
   - `codeImpression` : le code affiché dans le dashboard, section
     "Impression des tickets (print-agent)".
   - `printerName` : le nom exact noté à l'étape 1.
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
