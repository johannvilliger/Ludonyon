import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200">
      <div className="mx-auto flex max-w-5xl items-center px-6 py-3">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Ludothèque Nyon Région"
            width={2323}
            height={649}
            className="h-8 w-auto"
            priority
          />
        </Link>
      </div>
    </header>
  );
}
