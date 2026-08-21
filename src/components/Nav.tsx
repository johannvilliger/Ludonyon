"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Megaphone,
  CalendarDays,
  CalendarClock,
  Settings,
  LogOut,
} from "lucide-react";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import Avatar from "./Avatar";
import SignOutButton from "./SignOutButton";

const LINKS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/annuaire", label: "Annuaire", icon: Users },
  { href: "/annonces", label: "Annonces", icon: Megaphone },
  { href: "/evenements", label: "Événements", icon: CalendarDays },
  { href: "/planning", label: "Planning", icon: CalendarClock },
];

export default function Nav({
  userName,
  role,
  photoPath,
  canSeeOrganisation,
}: {
  userName: string;
  role: string;
  photoPath: string | null;
  canSeeOrganisation: boolean;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const itemClass = (active: boolean) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition justify-center sm:justify-start ${
      active
        ? "bg-brand-yellow-soft font-medium text-stone-900"
        : "text-stone-600 hover:bg-stone-100"
    }`;

  return (
    <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col border-r border-stone-200 bg-white py-4 sm:w-56">
      <Link
        href="/"
        className="flex items-center justify-center gap-2 px-2 sm:justify-start sm:px-4"
      >
        <Image
          src="/logo.png"
          alt="Ludothèque Nyon Région"
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-lg"
          priority
        />
        <span className="hidden leading-tight sm:block">
          <span className="block text-sm font-semibold text-stone-900">
            Ludonyon
          </span>
          <span className="block text-xs text-stone-400">Nyon Région</span>
        </span>
      </Link>

      <Link
        href="/profil"
        className="mx-2 mt-4 flex items-center gap-2 rounded-lg px-1 py-2 transition hover:bg-stone-100 sm:mx-4 sm:px-2"
      >
        <Avatar name={userName} photoPath={photoPath} size={32} />
        <span className="hidden min-w-0 leading-tight sm:block">
          <span className="block truncate text-sm font-medium text-stone-800">
            {userName}
          </span>
          <span className="block text-xs text-stone-400">
            {ROLE_LABELS[role as Role] ?? role}
          </span>
        </span>
      </Link>

      <nav className="mt-4 flex flex-1 flex-col gap-1 px-2 sm:px-3">
        {LINKS.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={itemClass(active)}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
              <span className="hidden sm:inline">{link.label}</span>
            </Link>
          );
        })}

        {canSeeOrganisation && (
          <Link
            href="/organisation"
            className={`mt-2 flex items-center gap-3 justify-center rounded-lg px-3 py-2 text-sm font-medium transition sm:justify-start ${
              isActive("/organisation")
                ? "bg-stone-900 text-white"
                : "bg-stone-100 text-stone-700 hover:bg-stone-900 hover:text-white"
            }`}
          >
            <Settings className="h-5 w-5 shrink-0" strokeWidth={2} />
            <span className="hidden sm:inline">Espace organisation</span>
          </Link>
        )}
      </nav>

      <div className="px-2 sm:px-3">
        <SignOutButton className="flex w-full items-center justify-center gap-3 rounded-lg px-3 py-2 text-sm text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 sm:justify-start">
          <LogOut className="h-5 w-5 shrink-0" strokeWidth={2} />
          <span className="hidden sm:inline">Se déconnecter</span>
        </SignOutButton>
      </div>
    </aside>
  );
}
