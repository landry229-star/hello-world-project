import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook FedaPay : notifie le serveur quand une transaction Mobile Money
 * change de statut. Met à jour la commande correspondante (status = paid|failed).
 *
 * Configurer dans le dashboard FedaPay :
 *   URL: https://<votre-domaine>/api/public/webhooks/fedapay
 */
export const Route = createFileRoute("/api/public/webhooks/fedapay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null);
        if (!body) return new Response("Bad request", { status: 400 });

        // FedaPay envoie { event, entity } où entity = transaction
        const event: string = body.event ?? body.name ?? "";
        const tx = body.entity ?? body["v1/transaction"] ?? body.transaction ?? null;
        if (!tx?.id) return new Response("Missing transaction id", { status: 400 });

        const reference = String(tx.id);
        type OrderStatus = "paid" | "cancelled" | "failed" | "pending";
        const status: OrderStatus =
          event === "transaction.approved" || tx.status === "approved"
            ? "paid"
            : event === "transaction.canceled" || tx.status === "canceled"
              ? "cancelled"
              : event === "transaction.declined" || tx.status === "declined"
                ? "failed"
                : "pending";

        if (status === "pending") return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("orders")
          .update({ status })
          .eq("payment_reference", reference);
        if (error) {
          console.error("Webhook update failed", error);
          return new Response("error", { status: 500 });
        }
        return new Response("ok");
      },
    },
  },
});