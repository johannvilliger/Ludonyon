import { redirect } from "next/navigation";
import Image from "next/image";
import { auth } from "@/auth";
import LoginForm from "./LoginForm";

export default async function ConnexionPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center">
            <Image
              src="/logo.png"
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 object-contain"
            />
          </div>
          <h1 className="text-xl font-semibold text-stone-900">
            Ludothèque Nyon Région
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Espace des bénévoles
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
