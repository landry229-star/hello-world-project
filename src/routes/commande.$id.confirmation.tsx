import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getOrder } from "@/lib/orders.functions";
import { verifyPayment } from "@/lib/payments.functions";
import { formatFCFA } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, Loader2, Receipt, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/commande/$id/confirmation")({
  head: () => ({ meta: [{ title: "Confirmation de commande — LandryShop" }] }),
  component: ConfirmationPage,
});

function ConfirmationPage() {
  const { id } = Route.useParams();
  const getOrderFn = useServerFn(getOrder);
  const verifyFn = useServerFn(verifyPayment);
  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrderFn({ data: { id } }),
    refetchInterval: (q) => {
      const o: any = q.state.data;
      return o && o.status === "pending" ? 4000 : false;
    },
  });
  const verifyMutation = useMutation({
    mutationFn: () => verifyFn({ data: { orderId: id } }),
    onSuccess: (r) => {
      if (r.status === "paid") toast.success("Paiement confirmé !");
      else if (r.status === "failed") toast.error("Paiement échoué.");
      else toast.info("Paiement toujours en attente.");
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
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
        <Button asChild className="mt-4"><Link to="/">Accueil</Link></Button>
      </div>
    );
  }

  const isPaid = order.status === "paid" || order.status === "delivered" || order.status === "shipped" || order.status === "preparing";
  const isFailed = order.status === "failed" || order.status === "cancelled";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-3xl border border-border bg-card p-6 text-center">
        {isPaid ? (
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
        ) : isFailed ? (
          <XCircle className="mx-auto h-14 w-14 text-destructive" />
        ) : (
          <Clock className="mx-auto h-14 w-14 text-primary" />
        )}
        <h1 className="mt-3 font-display text-2xl font-bold">
          {isPaid ? "Commande confirmée !" : isFailed ? "Paiement échoué" : "En attente de paiement"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isPaid
            ? "Merci pour votre achat. Vous recevrez bientôt des nouvelles."
            : isFailed
              ? "Le paiement n'a pas abouti. Vous pouvez réessayer depuis votre compte."
              : "Confirmez le paiement sur votre téléphone Mobile Money. Cette page se met à jour automatiquement."}
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Référence : <span className="font-mono">{order.id.slice(0, 8).toUpperCase()}</span>
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Détails</h2>
          <Badge variant="secondary">{order.status}</Badge>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {(order.order_items as Array<{ id: string; product_name: string; quantity: number; unit_price_xof: number }>).map((it) => (
            <li key={it.id} className="flex justify-between">
              <span>{it.product_name} × {it.quantity}</span>
              <span>{formatFCFA(it.unit_price_xof * it.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-border pt-3 font-display text-lg font-bold">
          <span>Total</span><span>{formatFCFA(order.total_xof)}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild className="rounded-full"><Link to="/compte">Retour à mon espace</Link></Button>
        <Button asChild variant="outline" className="rounded-full"><Link to="/boutique">Continuer mes achats</Link></Button>
        {isPaid && (
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/commande/$id/recu" params={{ id }}>
              <Receipt className="mr-1 h-3 w-3" /> Voir le reçu
            </Link>
          </Button>
        )}
        {order.status === "pending" && (
          <Button
            variant="ghost"
            onClick={() => verifyMutation.mutate()}
            disabled={verifyMutation.isPending}
          >
            {verifyMutation.isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3 w-3" />
            )}
            Vérifier le paiement
          </Button>
        )}
      </div>
    </div>
  );
}