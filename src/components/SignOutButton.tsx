"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/connexion" })}
      className={
        className ??
        "rounded-lg border border-stone-300 px-3 py-1.5 text-stone-600 transition hover:bg-stone-100"
      }
    >
      {children ?? "Se déconnecter"}
    </button>
  );
}
