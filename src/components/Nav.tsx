"use client";

import { useEffect, useState } from "react";
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
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
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

const COLLAPSE_KEY = "ludonyon-nav-collapsed";

type NavProps = {
  userName: string;
  role: string;
  photoPath: string | null;
  canSeeOrganisation: boolean;
};

// Contenu commun au rail replié/déplié (desktop) et au tiroir (mobile) :
// logo, fiche bénévole, liens, Espace organisation, déconnexion.
function NavBody({
  userName,
  role,
  photoPath,
  canSeeOrganisation,
  expanded,
  onNavigate,
}: NavProps & { expanded: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const labelClass = expanded ? "inline" : "hidden";
  const labelBlockClass = expanded ? "block" : "hidden";
  const justifyClass = expanded ? "justify-start" : "justify-center";

  const itemClass = (active: boolean) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${justifyClass} ${
      active
        ? "bg-brand-yellow-soft font-medium text-stone-900"
        : "text-stone-600 hover:bg-stone-100"
    }`;

  return (
    <>
      <Link
        href="/"
        onClick={onNavigate}
        className={`flex items-center gap-2 px-4 ${justifyClass}`}
      >
        <Image
          src="/logo.png"
          alt="Ludothèque Nyon Région"
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-lg"
          priority
        />
        <span className={`${labelBlockClass} leading-tight`}>
          <span className="block text-sm font-semibold text-stone-900">
            Ludothèque
          </span>
          <span className="block text-xs text-stone-400">Nyon Région</span>
        </span>
      </Link>

      <Link
        href="/profil"
        onClick={onNavigate}
        className={`mx-2 mt-4 flex items-center gap-2 rounded-lg px-1 py-2 transition hover:bg-stone-100 ${
          expanded ? "mx-4 px-2" : ""
        }`}
      >
        <Avatar name={userName} photoPath={photoPath} size={32} />
        <span className={`${labelBlockClass} min-w-0 leading-tight`}>
          <span className="block truncate text-sm font-medium text-stone-800">
            {userName}
          </span>
          <span className="block text-xs text-stone-400">
            {ROLE_LABELS[role as Role] ?? role}
          </span>
        </span>
      </Link>

      <nav className={`mt-4 flex flex-1 flex-col gap-1 px-2 ${expanded ? "px-3" : ""}`}>
        {LINKS.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={itemClass(active)}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
              <span className={labelClass}>{link.label}</span>
            </Link>
          );
        })}

        {canSeeOrganisation && (
          <Link
            href="/organisation"
            onClick={onNavigate}
            className={`mt-2 flex items-center gap-3 ${justifyClass} rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive("/organisation")
                ? "bg-stone-900 text-white"
                : "bg-stone-100 text-stone-700 hover:bg-stone-900 hover:text-white"
            }`}
          >
            <Settings className="h-5 w-5 shrink-0" strokeWidth={2} />
            <span className={labelClass}>Espace organisation</span>
          </Link>
        )}
      </nav>

      <div className={`px-2 ${expanded ? "px-3" : ""}`}>
        <SignOutButton
          className={`flex w-full items-center gap-3 ${justifyClass} rounded-lg px-3 py-2 text-sm text-stone-500 transition hover:bg-stone-100 hover:text-stone-800`}
        >
          <LogOut className="h-5 w-5 shrink-0" strokeWidth={2} />
          <span className={labelClass}>Se déconnecter</span>
        </SignOutButton>
      </div>
    </>
  );
}

export default function Nav(props: NavProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Détecte un changement de route pendant le rendu pour refermer le
  // tiroir mobile, sans passer par un effet (approche recommandée par
  // React pour "ajuster un état suite à un changement de prop").
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setDrawerOpen(false);
  }

  useEffect(() => {
    // Lecture d'un stockage propre au navigateur, possible seulement après
    // montage (indisponible côté serveur) : cas d'usage légitime d'effet
    // pour éviter un décalage d'hydratation SSR/client.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true);
    } catch {
      // localStorage indisponible (navigation privée, etc.) : on ignore
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // idem
      }
      return next;
    });
  }

  return (
    <>
      {/* Desktop/tablette (≥640px) : rail permanent, repliable en icônes
          seules via le bouton en haut. */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-stone-200 bg-white py-4 transition-[width] sm:flex ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        <div className={`flex items-center px-2 ${collapsed ? "justify-center" : "justify-end"}`}>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="shrink-0 rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label={collapsed ? "Agrandir le menu" : "Réduire le menu"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" strokeWidth={2} />
            ) : (
              <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
        </div>
        <NavBody {...props} expanded={!collapsed} />
      </aside>

      {/* Mobile (<640px) : barre fine + tiroir plein écran, pour ne pas
          rogner la largeur déjà limitée du contenu (sous-menu Espace
          organisation notamment). */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-200 bg-white px-3 py-2 sm:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-6 w-6" strokeWidth={2} />
        </button>
        <Image
          src="/logo.png"
          alt="Ludothèque Nyon Région"
          width={28}
          height={28}
          className="h-7 w-7 rounded-md"
        />
        <Link href="/profil">
          <Avatar name={props.userName} photoPath={props.photoPath} size={28} />
        </Link>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white py-4 shadow-xl">
            <div className="flex items-center justify-end px-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
            <NavBody {...props} expanded onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
