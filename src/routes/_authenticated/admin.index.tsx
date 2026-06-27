import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminStats } from "@/lib/admin.functions";
import { formatFCFA } from "@/lib/format";
import { Package, Receipt, TrendingUp, AlertTriangle, ArrowUpRight, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const statsFn = useServerFn(adminStats);
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: () => statsFn() });

  if (isLoading) return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Chargement des statistiques…
    </div>
  );
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Vue d'ensemble</h2>
        <p className="text-sm text-muted-foreground">Performance en temps réel de votre boutique</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card icon={TrendingUp} label="Chiffre d'affaires" value={formatFCFA(data.revenueXof)} tone="primary" />
        <Card icon={Receipt} label="Commandes payées" value={String(data.paidCount)} sub={`${data.ordersCount} au total`} tone="success" />
        <Card icon={Package} label="Produits" value={String(data.productsCount)} tone="muted" />
        <Card icon={AlertTriangle} label="Stock bas" value={String(data.lowStock)} sub="≤ 3 unités" tone="warning" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <QuickLink to="/admin/produits" title="Gérer les produits" desc="Ajouter, modifier ou retirer des articles" icon={Package} />
        <QuickLink to="/admin/commandes" title="Suivre les commandes" desc="Voir les paiements et reçus clients" icon={Receipt} />
      </div>
    </div>
  );
}

function Card({ icon: Icon, label, value, sub, tone = "muted" }: { icon: any; label: string; value: string; sub?: string; tone?: "primary" | "success" | "warning" | "muted" }) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-foreground",
  }[tone];
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function QuickLink({ to, title, desc, icon: Icon }: { to: string; title: string; desc: string; icon: any }) {
  return (
    <Link to={to} className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:bg-primary/5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-display font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}