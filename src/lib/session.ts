import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isOrganisationRole } from "@/lib/roles";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/connexion");
  }
  return session.user;
}

export async function requireOrganisationUser() {
  const user = await requireUser();
  if (!isOrganisationRole(user.role)) {
    redirect("/");
  }
  return user;
}
