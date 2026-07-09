import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { listMyOrders } from "@/lib/orders.functions";
import { getDigitalDownload } from "@/lib/payments.functions";
import { formatFCFA } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Package, Loader2, Receipt, ShoppingBag, Wallet, Clock, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/compte")({
  head: () => ({ meta: [{ title: "Mon compte — LandryShop" }] }),
  component: AccountPage,
});

function AccountPage() {
  const listOrdersFn = useServerFn(listMyOrders);
  const downloadFn = useServerFn(getDigitalDownload);
  const { user } = useAuth();
  const router = useRouter();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => listOrdersFn(),
  });

  const downloadMutation = useMutation({
    mutationFn: (orderItemId: string) => downloadFn({ data: { orderItemId } }),
    onSuccess: (r) => window.open(r.url, "_blank"),
    onError: (e: Error) => toast.error(e.message),
  });

  const ordersList: any[] = orders ?? [];
  const totalSpent = ordersList
    .filter((o) => ["paid", "delivered", "preparing", "shipped"].includes(o.status))
    .reduce((acc, o) => acc + (o.total_xof || 0), 0);
  const pendingCount = ordersList.filter((o) => o.status === "pending").length;
  const initial = (user?.email ?? "?").slice(0, 1).toUpperCase();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        {/* Hero */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow">
                {initial}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Bienvenue</p>
                <h1 className="font-display text-2xl font-bold leading-tight md:text-3xl">Mon espace</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" className="rounded-full" onClick={handleSignOut}>
                <LogOut className="mr-1 h-4 w-4" /> Déconnexion
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StatCard icon={ShoppingBag} label="Commandes" value={String(ordersList.length)} tone="primary" />
            <StatCard icon={Wallet} label="Total dépensé" value={formatFCFA(totalSpent)} tone="success" />
            <StatCard icon={Clock} label="En attente" value={String(pendingCount)} tone="muted" />
          </div>
        </div>

        {/* Orders */}
        <div className="mt-8 flex items-end justify-between">
          <h2 className="font-display text-xl font-bold">Mes commandes</h2>
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link to="/boutique">Continuer mes achats →</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </div>
        ) : ordersList.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-border bg-card/50 p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-3 font-display text-lg font-semibold">Aucune commande pour le moment</p>
            <p className="mt-1 text-sm text-muted-foreground">Découvrez notre boutique et passez votre première commande.</p>
            <Button asChild className="mt-5 rounded-full"><Link to="/boutique">Voir la boutique</Link></Button>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {ordersList.map((o: any) => (
              <li key={o.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <Badge variant={o.status === "paid" || o.status === "delivered" ? "default" : "secondary"}>
                    {o.status}
                  </Badge>
                  <p className="font-display text-lg font-bold">{formatFCFA(o.total_xof)}</p>
                </div>
                <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
                  {o.order_items?.map((it: any) => (
                    <li key={it.id} className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">{it.product_name} × {it.quantity}</span>
                      {it.product_type === "digital" && it.digital_file_path && (o.status === "paid" || o.status === "delivered") && (
                        <Button size="sm" variant="ghost" onClick={() => downloadMutation.mutate(it.id)} disabled={downloadMutation.isPending}>
                          <Download className="mr-1 h-3 w-3" /> Télécharger
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button asChild size="sm" variant="outline" className="rounded-full">
                    <Link to="/commande/$id/confirmation" params={{ id: o.id }}>Détails</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="rounded-full">
                    <Link to="/commande/$id/recu" params={{ id: o.id }}>
                      <Receipt className="mr-1 h-3 w-3" /> Reçu
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: "primary" | "success" | "muted" }) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    muted: "bg-muted text-foreground",
  }[tone];
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-xl font-bold">{value}</p>
    </div>
  );
}