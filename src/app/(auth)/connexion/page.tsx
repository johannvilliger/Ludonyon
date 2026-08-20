import { redirect } from "next/navigation";
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
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-2xl">
            🎲
          </div>
          <h1 className="text-xl font-semibold text-stone-900">Ludonyon</h1>
          <p className="mt-1 text-sm text-stone-500">
            Espace des bénévoles de la Ludothèque Nyon Région
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
