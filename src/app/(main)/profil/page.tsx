import { requireUser } from "@/lib/session";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function ProfilPage() {
  const user = await requireUser();

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold text-stone-900">Mon profil</h1>

      <div className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
        <p className="font-medium text-stone-900">{user.name}</p>
        <p className="text-sm text-stone-600">{user.email}</p>
        <p className="mt-1 text-xs text-stone-400">
          Rôle : {ROLE_LABELS[user.role as Role] ?? user.role}
        </p>
      </div>

      <h2 className="mt-8 text-lg font-medium text-stone-900">
        Changer mon mot de passe
      </h2>
      <ChangePasswordForm />
    </div>
  );
}
