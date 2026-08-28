"use client";

import { useActionState } from "react";
import {
  previewVolunteerImport,
  applyVolunteerImport,
  type VolunteerImportPreviewState,
  type VolunteerImportApplyState,
} from "@/lib/actions/volunteerImport";

const initialPreviewState: VolunteerImportPreviewState = {};
const initialApplyState: VolunteerImportApplyState = {};

export default function VolunteerImportForm({ mailIsConfigured }: { mailIsConfigured: boolean }) {
  const [previewState, previewAction, isPreviewing] = useActionState(
    previewVolunteerImport,
    initialPreviewState
  );
  const [applyState, applyAction, isApplying] = useActionState(
    applyVolunteerImport,
    initialApplyState
  );

  if (applyState.summary) {
    const s = applyState.summary;
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Import terminé : {s.created} compte(s) créé(s), {s.updated} mis à jour
          {s.emailsSent > 0 ? `, ${s.emailsSent} email(s) de bienvenue envoyé(s)` : ""}
          {s.skipped > 0 ? `, ${s.skipped} ligne(s) ignorée(s) (doublon)` : ""}.
        </p>
        <a
          href="/organisation/benevoles/import"
          className="mt-3 inline-block text-sm text-brand-blue hover:underline"
        >
          Faire un nouvel import
        </a>
      </div>
    );
  }

  if (previewState.rows && previewState.rows.length > 0) {
    return (
      <div className="space-y-4">
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-3 py-2">Ligne</th>
                <th className="px-3 py-2">Nom</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Téléphone</th>
                <th className="px-3 py-2">Poste / Rôle</th>
                <th className="px-3 py-2">Disponibilités</th>
                <th className="px-3 py-2">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {previewState.rows.map((row) => (
                <tr key={row.line} className={row.status === "duplicate" ? "opacity-50" : ""}>
                  <td className="px-3 py-2 text-stone-400">{row.line}</td>
                  <td className="px-3 py-2">
                    {row.name}
                    {row.nameChanged && (
                      <div className="text-xs text-stone-400">était : {row.existingName}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">{row.email}</td>
                  <td className="px-3 py-2">
                    {row.phone}
                    {row.phoneChanged && <div className="text-xs text-stone-400">modifié</div>}
                  </td>
                  <td className="px-3 py-2">
                    {row.posteLabel ?? "—"}
                    {row.posteWillChange && <div className="text-xs text-stone-400">modifié</div>}
                    {row.proposeResponsable && (
                      <div className="text-xs font-medium text-brand-blue">
                        Rôle Responsable{row.roleWillChange ? " (nouveau)" : ""}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {row.slotLabels.length > 0 ? row.slotLabels.join(", ") : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {row.status === "new" && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Nouveau compte
                      </span>
                    )}
                    {row.status === "update" && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Mise à jour
                      </span>
                    )}
                    {row.status === "duplicate" && (
                      <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-600">
                        Ignorée (doublon)
                      </span>
                    )}
                    {row.warnings.map((w, i) => (
                      <div key={i} className="mt-1 text-xs text-amber-600">
                        ⚠ {w}
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form action={applyAction} className="rounded-xl border border-stone-200 bg-white p-4">
          <input type="hidden" name="pasted" value={previewState.pasted} />
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name="sendEmails"
              defaultChecked={mailIsConfigured}
              disabled={!mailIsConfigured}
              className="h-4 w-4 rounded border-stone-300 text-brand-blue focus:ring-brand-blue"
            />
            Envoyer un email de bienvenue (identifiants) aux nouveaux comptes créés
          </label>
          {!mailIsConfigured && (
            <p className="mt-1 text-xs text-stone-400">
              Serveur d&rsquo;envoi d&rsquo;emails non configuré : les identifiants provisoires
              devront être communiqués manuellement.
            </p>
          )}
          {applyState.error && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {applyState.error}
            </p>
          )}
          <button
            type="submit"
            disabled={isApplying}
            className="mt-3 rounded-lg border-2 border-black bg-brand-yellow px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand-yellow-dark disabled:opacity-60"
          >
            {isApplying
              ? "Import en cours…"
              : `Confirmer l'import (${previewState.rows.filter((r) => r.status !== "duplicate").length} ligne(s))`}
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={previewAction} className="space-y-3">
      <textarea
        name="pasted"
        required
        rows={10}
        placeholder="Collez ici les lignes copiées depuis Excel (PRÉNOM, NOM, MOBILE, E MAIL, NIVEAU, JOURS, FRÉQUENCE)…"
        className="w-full rounded-lg border border-stone-300 px-3 py-2 font-mono text-xs focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
      />
      {previewState.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{previewState.error}</p>
      )}
      <button
        type="submit"
        disabled={isPreviewing}
        className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-stone-100 disabled:opacity-60"
      >
        {isPreviewing ? "Analyse en cours…" : "Prévisualiser"}
      </button>
    </form>
  );
}
