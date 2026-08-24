"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { verifierApprobation, type StatutAttente } from "../../actions";

export function PollClient({ numero }: { numero: number }) {
  const router = useRouter();
  const [statut, setStatut] = useState<StatutAttente>("attente");

  useEffect(() => {
    let annule = false;

    const verifier = async () => {
      const resultat = await verifierApprobation(numero);
      if (annule) return;
      setStatut(resultat.statut);
      if (resultat.statut === "approuve") {
        router.push(`/caisse/${numero}`);
      }
    };

    const interval = setInterval(verifier, 2000);
    return () => {
      annule = true;
      clearInterval(interval);
    };
  }, [numero, router]);

  if (statut === "refuse") {
    return (
      <p className="mt-4 text-sm text-red-600">
        Demande refusée ou expirée. Retourne à{" "}
        <a href="/gestion" className="underline">
          /gestion
        </a>{" "}
        pour retaper ton code.
      </p>
    );
  }

  return (
    <p className="mt-4 flex items-center gap-2 text-sm text-zinc-500">
      <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
      En attente de validation depuis le dashboard…
    </p>
  );
}
