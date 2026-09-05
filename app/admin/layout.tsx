import { redirect } from "next/navigation";

import { auth } from "@/auth";
import AdminSidebar from "@/Components/admin/AdminSidebar";

/**
 * Admin shell. Stays a Server Component so the session check never reaches the
 * client and the nav is the only JavaScript shipped for the chrome.
 */
const AdminLayout = async ({ children }: LayoutProps<"/admin">) => {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  if (session?.user?.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <AdminSidebar name={session.user.name} email={session.user.email} />
      <main className="min-w-0 flex-1 md:h-dvh md:overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-8 p-5 md:p-8 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
