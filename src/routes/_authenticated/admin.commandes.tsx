import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListOrders, adminUpdateOrderStatus } from "@/lib/admin.functions";
import { formatFCFA } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/commandes")({
  component: OrdersAdmin,
});

const STATUSES = ["pending", "paid", "preparing", "shipped", "delivered", "cancelled", "failed"] as const;

function OrdersAdmin() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListOrders);
  const updateFn = useServerFn(adminUpdateOrderStatus);

  const { data: orders, isLoading } = useQuery({ queryKey: ["admin-orders"], queryFn: () => listFn() });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: typeof STATUSES[number] }) => updateFn({ data: { id, status } }),
    onSuccess: () => { toast.success("Statut mis à jour"); qc.invalidateQueries({ queryKey: ["admin-orders"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (!orders || orders.length === 0) {
    return <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Aucune commande pour le moment.</div>;
  }

  return (
    <ul className="space-y-3">
      {orders.map((o: any) => (
        <li key={o.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-mono text-xs">{o.id.slice(0, 8).toUpperCase()}</p>
              <p className="text-sm font-medium">{o.customer_name}</p>
              <p className="text-xs text-muted-foreground">{o.customer_phone} · {o.customer_email}</p>
              <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("fr-FR")}</p>
            </div>
            <div className="text-right">
              <Badge>{o.payment_operator?.toUpperCase() ?? "—"}</Badge>
              <p className="mt-1 font-display text-lg font-bold">{formatFCFA(o.total_xof)}</p>
              <div className="mt-1 flex items-center justify-end gap-2">
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link to="/commande/$id/recu" params={{ id: o.id }}>
                    <Receipt className="mr-1 h-3 w-3" /> Reçu
                  </Link>
                </Button>
                <Select value={o.status} onValueChange={(v) => updateMutation.mutate({ id: o.id, status: v as any })}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {o.order_items?.map((it: any) => (
              <li key={it.id} className="flex justify-between">
                <span>{it.product_name} × {it.quantity}</span>
                <span>{formatFCFA(it.unit_price_xof * it.quantity)}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}