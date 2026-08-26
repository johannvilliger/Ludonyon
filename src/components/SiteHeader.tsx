"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const pathname = usePathname();
  // Sur les pages caisse, le logo ne doit pas être cliquable : un clic
  // accidentel en pleine vente ne doit jamais sortir le caissier de l'appli.
  const logoCliquable = !pathname?.startsWith("/caisse");

  const logo = (
    <Image
      src="/logo.png"
      alt="Ludothèque Nyon Région"
      width={2323}
      height={649}
      className="h-8 w-auto"
      priority
    />
  );

  return (
    <header className="border-b border-zinc-200 print:hidden">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        {logoCliquable ? (
          <Link href="/" className="flex items-center">
            {logo}
          </Link>
        ) : (
          <span className="flex items-center">{logo}</span>
        )}
        {pathname === "/" && (
          <Link href="/benevole" className="text-sm font-medium text-zinc-600 hover:underline">
            Login bénévole
          </Link>
        )}
      </div>
    </header>
  );
}
