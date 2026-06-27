import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getOrder } from "@/lib/orders.functions";
import { formatFCFA } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/commande/$id/recu")({
  head: () => ({ meta: [{ title: "Reçu de commande — LandryShop" }] }),
  component: ReceiptPage,
});

function ReceiptPage() {
  const { id } = Route.useParams();
  const getOrderFn = useServerFn(getOrder);
  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrderFn({ data: { id } }),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !order) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-sm text-destructive">{(error as Error)?.message ?? "Commande introuvable"}</p>
      </div>
    );
  }

  const items = order.order_items as Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price_xof: number;
  }>;
  const ref = order.id.slice(0, 8).toUpperCase();
  const date = new Date(order.created_at).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-4 flex justify-between print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link to="/commande/$id/confirmation" params={{ id }}>
            <ArrowLeft className="mr-1 h-3 w-3" /> Retour
          </Link>
        </Button>
        <Button size="sm" onClick={() => window.print()} className="rounded-full">
          <Printer className="mr-1 h-3 w-3" /> Imprimer / PDF
        </Button>
      </div>

      <div id="print-area" className="rounded-3xl border border-border bg-card p-8 print:border-0 print:p-0">
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <h1 className="font-display text-2xl font-bold">LandryShop</h1>
            <p className="text-xs text-muted-foreground">azoganlandry3@gmail.com</p>
            <p className="text-xs text-muted-foreground">+229 01 61 89 69 88</p>
          </div>
          <div className="text-right">
            <p className="font-display text-lg font-semibold">Reçu</p>
            <p className="font-mono text-xs">N° {ref}</p>
            <p className="text-xs text-muted-foreground">{date}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Client</p>
            <p className="font-medium">{order.customer_name}</p>
            <p className="text-xs">{order.customer_email}</p>
            <p className="text-xs">{order.customer_phone}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Livraison</p>
            <p className="text-xs">{order.shipping_address ?? "—"}</p>
            <p className="text-xs">{order.shipping_city ?? ""}</p>
          </div>
        </div>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <th className="py-2">Article</th>
              <th className="py-2 text-center">Qté</th>
              <th className="py-2 text-right">P.U.</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-border/50">
                <td className="py-2">{it.product_name}</td>
                <td className="py-2 text-center">{it.quantity}</td>
                <td className="py-2 text-right">{formatFCFA(it.unit_price_xof)}</td>
                <td className="py-2 text-right">{formatFCFA(it.unit_price_xof * it.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-between border-t border-border pt-3 font-display text-lg font-bold">
          <span>Total payé</span>
          <span>{formatFCFA(order.total_xof)}</span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
          <div>
            <p className="uppercase">Statut</p>
            <p className="font-medium text-foreground">{order.status}</p>
          </div>
          <div>
            <p className="uppercase">Paiement</p>
            <p className="font-medium text-foreground">
              Mobile Money — {String(order.payment_operator ?? "—").toUpperCase()}
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Merci pour votre confiance. — LandryShop
        </p>
      </div>
    </div>
  );
}