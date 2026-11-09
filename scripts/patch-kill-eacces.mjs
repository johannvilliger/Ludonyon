// `next build` tue de force ses processus workers internes (génération des
// pages statiques, collecte des données de page) via kill("SIGTERM") s'ils
// mettent plus de 500ms à se terminer proprement après le signal de fin
// (voir next/dist/compiled/jest-worker : BaseWorkerPool.end() -> forceExit()
// -> ChildProcessWorker.kill()). Sur l'hébergement Node.js d'Infomaniak, ce
// kill() est refusé par le bac à sable (EACCES) MÊME sur un processus créé
// par l'appli elle-même — Next.js traite ça comme une erreur de build fatale
// ("> Build error occurred") alors que la compilation avait déjà réussi
// juste avant (voir "Finalizing page optimization" dans les logs).
//
// Chargé via `node --import` sur la commande `next build` elle-même (voir
// le script "build" de package.json) : `child_process.fork` propage par
// défaut les options d'exécution (execArgv) du processus courant à ses
// enfants, donc ce patch atteint aussi bien le processus de build que
// forke `next build` en interne (buildInChild) que les workers que ce
// dernier forke à son tour pour la génération des pages — pas besoin de le
// charger à plusieurs endroits.
//
// Ne avale QUE l'EACCES sur kill : toute autre erreur continue de remonter
// normalement, pour ne jamais masquer un vrai problème de build.

import { ChildProcess } from "node:child_process";

function estKillEaccesRefuse(err) {
  return Boolean(err) && err.code === "EACCES" && err.syscall === "kill";
}

const killOriginalEnfant = ChildProcess.prototype.kill;
ChildProcess.prototype.kill = function killPatche(...args) {
  try {
    return killOriginalEnfant.apply(this, args);
  } catch (err) {
    if (estKillEaccesRefuse(err)) return false;
    throw err;
  }
};

const killOriginalProcessus = process.kill;
process.kill = function killProcessusPatche(...args) {
  try {
    return killOriginalProcessus.apply(process, args);
  } catch (err) {
    if (estKillEaccesRefuse(err)) return false;
    throw err;
  }
};
