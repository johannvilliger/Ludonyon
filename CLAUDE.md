@AGENTS.md

## Rappel systématique : mise à jour de la base

À chaque fois que je pousse des changements sur `main` (ou toute branche
destinée au déploiement Infomaniak), je dois **toujours préciser** si une
migration DB est nécessaire ou non, et si oui donner les commandes exactes
à lancer côté serveur (typiquement `git pull && npm install && npm run
db:migrate && npm run build` + redémarrage de l'appli). Ne jamais laisser
Johann deviner — le dire explicitement même quand la réponse est "non,
rien à faire côté base".
