import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Package, FolderTree, Receipt, ShieldCheck, ShieldAlert } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="mx-auto max-w-7xl px-4 py-6 md:py-10">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Espace sécurisé</p>
              <h1 className="font-display text-2xl font-bold leading-tight">Console d'administration</h1>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2">
            <NavLink to="/admin" icon={LayoutDashboard} label="Tableau de bord" exact />
            <NavLink to="/admin/produits" icon={Package} label="Produits" />
            <NavLink to="/admin/categories" icon={FolderTree} label="Catégories" />
            <NavLink to="/admin/commandes" icon={Receipt} label="Commandes" />
            <NavLink to="/admin/audit" icon={ShieldAlert} label="Audit" />
          </nav>
        </div>
        <div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function NavLink({ to, icon: Icon, label, exact }: { to: string; icon: any; label: string; exact?: boolean }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1.5 rounded-full border border-transparent px-3.5 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground"
      activeProps={{ className: "border-primary/30 bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground" }}
      activeOptions={{ exact }}
    >
      <Icon className="h-4 w-4" /> {label}
    </Link>
  );
}