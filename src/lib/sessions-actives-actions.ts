"use server";

import { signalerActiviteEnCours } from "./sessions-actives";

export async function signalerActivite(cle: string, label: string): Promise<void> {
  if (!cle.trim() || !label.trim()) return;
  signalerActiviteEnCours(cle, label.slice(0, 200));
}
