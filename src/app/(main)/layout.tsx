import { requireUser } from "@/lib/session";
import { isOrganisationRole } from "@/lib/roles";
import Nav from "@/components/Nav";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <Nav
        userName={user.name ?? user.email ?? ""}
        role={user.role}
        canSeeOrganisation={isOrganisationRole(user.role)}
      />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
