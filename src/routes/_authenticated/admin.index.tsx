import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminStats } from "@/lib/admin.functions";
import { formatFCFA } from "@/lib/format";
import { Package, Receipt, TrendingUp, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const statsFn = useServerFn(adminStats);
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: () => statsFn() });

  if (isLoading) return <div className="text-sm text-muted-foreground">Chargement…</div>;
  if (!data) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
      <Card icon={TrendingUp} label="Chiffre d'affaires" value={formatFCFA(data.revenueXof)} />
      <Card icon={Receipt} label="Commandes payées" value={String(data.paidCount)} sub={`${data.ordersCount} au total`} />
      <Card icon={Package} label="Produits" value={String(data.productsCount)} />
      <Card icon={AlertTriangle} label="Stock bas" value={String(data.lowStock)} sub="≤ 3 unités" />
    </div>
  );
}

function Card({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}