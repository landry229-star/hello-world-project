import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook KKiaPay : notifie le serveur quand une transaction change de statut.
 * Configurer dans le dashboard KKiaPay :
 *   URL: https://<votre-domaine>/api/public/webhooks/kkiapay
 */
export const Route = createFileRoute("/api/public/webhooks/kkiapay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null);
        if (!body) return new Response("Bad request", { status: 400 });

        const tx = body.data ?? body.transaction ?? body;
        const reference: string | undefined = tx?.transactionId ?? tx?.id;
        const rawStatus: string = String(tx?.status ?? body?.status ?? "").toUpperCase();
        if (!reference) return new Response("Missing transaction id", { status: 400 });

        type OrderStatus = "paid" | "cancelled" | "failed" | "pending";
        const status: OrderStatus =
          rawStatus === "SUCCESS" || rawStatus === "APPROVED"
            ? "paid"
            : rawStatus === "FAILED" || rawStatus === "DECLINED"
              ? "failed"
              : rawStatus === "CANCELLED" || rawStatus === "CANCELED"
                ? "cancelled"
                : "pending";

        if (status === "pending") return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("orders")
          .update({ status })
          .eq("payment_reference", reference);
        if (error) {
          console.error("KKiaPay webhook update failed", error);
          return new Response("error", { status: 500 });
        }
        return new Response("ok");
      },
    },
  },
});