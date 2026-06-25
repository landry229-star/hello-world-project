import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { listMyOrders } from "@/lib/orders.functions";
import { getDigitalDownload } from "@/lib/payments.functions";
import { bootstrapAdmin } from "@/lib/admin.functions";
import { formatFCFA } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/compte")({
  head: () => ({ meta: [{ title: "Mon compte — LandryShop" }] }),
  component: AccountPage,
});

function AccountPage() {
  const listOrdersFn = useServerFn(listMyOrders);
  const downloadFn = useServerFn(getDigitalDownload);
  const bootstrapFn = useServerFn(bootstrapAdmin);
  const { user, isAdmin } = useAuth();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => listOrdersFn(),
  });

  const downloadMutation = useMutation({
    mutationFn: (orderItemId: string) => downloadFn({ data: { orderItemId } }),
    onSuccess: (r) => window.open(r.url, "_blank"),
    onError: (e: Error) => toast.error(e.message),
  });

  const bootstrapMutation = useMutation({
    mutationFn: () => bootstrapFn(),
    onSuccess: () => {
      toast.success("Vous êtes maintenant administrateur. Rechargez la page.");
      setTimeout(() => window.location.reload(), 800);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Mon compte</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
        </div>
        {!isAdmin && (
          <Button variant="outline" size="sm" onClick={() => bootstrapMutation.mutate()} disabled={bootstrapMutation.isPending}>
            {bootstrapMutation.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Devenir admin (1er compte)
          </Button>
        )}
      </div>

      <h2 className="mt-8 font-display text-xl font-semibold">Mes commandes</h2>

      {isLoading ? (
        <div className="mt-4 text-sm text-muted-foreground">Chargement…</div>
      ) : !orders || orders.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          <Package className="mx-auto h-10 w-10" />
          <p className="mt-2">Vous n'avez pas encore de commande.</p>
          <Button asChild className="mt-4 rounded-full"><Link to="/boutique">Voir la boutique</Link></Button>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {orders.map((o: any) => (
            <li key={o.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                  <p className="font-mono text-xs">{o.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <Badge variant={o.status === "paid" || o.status === "delivered" ? "default" : "secondary"}>
                  {o.status}
                </Badge>
                <p className="font-display font-bold">{formatFCFA(o.total_xof)}</p>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {o.order_items?.map((it: any) => (
                  <li key={it.id} className="flex items-center justify-between gap-2">
                    <span>{it.product_name} × {it.quantity}</span>
                    {it.product_type === "digital" && it.digital_file_path && (o.status === "paid" || o.status === "delivered") && (
                      <Button size="sm" variant="ghost" onClick={() => downloadMutation.mutate(it.id)} disabled={downloadMutation.isPending}>
                        <Download className="mr-1 h-3 w-3" /> Télécharger
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}