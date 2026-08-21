import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isOrganisationRole } from "@/lib/roles";
import Nav from "@/components/Nav";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { photoPath: true },
  });

  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      <Nav
        userName={user.name ?? user.email ?? ""}
        role={user.role}
        photoPath={dbUser?.photoPath ?? null}
        canSeeOrganisation={isOrganisationRole(user.role)}
      />
      <main className="min-w-0 flex-1 px-4 py-6 sm:py-8">
        <div className="mx-auto w-full max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
