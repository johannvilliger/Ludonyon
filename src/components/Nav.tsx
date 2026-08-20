import Link from "next/link";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import SignOutButton from "./SignOutButton";

export default function Nav({
  userName,
  role,
  canSeeOrganisation,
}: {
  userName: string;
  role: string;
  canSeeOrganisation: boolean;
}) {
  const links = [
    { href: "/", label: "Accueil" },
    { href: "/annuaire", label: "Annuaire" },
    { href: "/annonces", label: "Annonces" },
    { href: "/evenements", label: "Événements" },
  ];

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-lg">
              🎲
            </span>
            Ludonyon
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-stone-600">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition hover:text-stone-900"
              >
                {link.label}
              </Link>
            ))}
            {canSeeOrganisation && (
              <Link
                href="/organisation"
                className="rounded-full bg-stone-900 px-3 py-1 text-white transition hover:bg-stone-700"
              >
                Espace organisation
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/profil"
            className="text-stone-500 transition hover:text-stone-900"
          >
            <span className="font-medium text-stone-800">{userName}</span>
            <span className="ml-1 text-xs text-stone-400">
              ({ROLE_LABELS[role as Role] ?? role})
            </span>
          </Link>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
