import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Package, FolderTree, Receipt } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/compte" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
        <h1 className="mr-4 font-display text-2xl font-bold">Administration</h1>
        <NavLink to="/admin" icon={LayoutDashboard} label="Dashboard" exact />
        <NavLink to="/admin/produits" icon={Package} label="Produits" />
        <NavLink to="/admin/categories" icon={FolderTree} label="Catégories" />
        <NavLink to="/admin/commandes" icon={Receipt} label="Commandes" />
      </div>
      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}

function NavLink({ to, icon: Icon, label, exact }: { to: string; icon: any; label: string; exact?: boolean }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
      activeOptions={{ exact }}
    >
      <Icon className="h-4 w-4" /> {label}
    </Link>
  );
}