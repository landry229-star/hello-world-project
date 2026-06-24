import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Initialise un paiement Mobile Money via FedaPay (agrégateur béninois).
 * Si FEDAPAY_SECRET_KEY n'est pas configurée, on bascule en "mode démo"
 * qui marque la commande comme payée immédiatement (utile pour tester
 * tout le flux sans clé API). En production, configurez la clé secrète
 * FedaPay sandbox ou live pour déclencher le vrai paiement MTN/Moov.
 */
export const initPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ orderId: z.string().uuid(), returnUrl: z.string().url() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, total_xof, status, customer_email, customer_phone, customer_name, payment_operator, user_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order || order.user_id !== userId) throw new Error("Commande introuvable");
    if (order.status !== "pending") {
      return { mode: "noop" as const, redirectUrl: data.returnUrl };
    }

    const secret = process.env.FEDAPAY_SECRET_KEY;
    const apiBase = process.env.FEDAPAY_ENV === "live"
      ? "https://api.fedapay.com/v1"
      : "https://sandbox-api.fedapay.com/v1";

    if (!secret) {
      // Mode démo : marquer la commande comme payée pour tester le flux complet.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("orders")
        .update({ status: "paid", payment_reference: `DEMO-${order.id.slice(0, 8)}` })
        .eq("id", order.id);
      return { mode: "demo" as const, redirectUrl: data.returnUrl };
    }

    const [firstname, ...rest] = order.customer_name.split(" ");
    const lastname = rest.join(" ") || firstname;

    const res = await fetch(`${apiBase}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        description: `Commande ${order.id.slice(0, 8)}`,
        amount: order.total_xof,
        currency: { iso: "XOF" },
        callback_url: data.returnUrl,
        customer: {
          firstname,
          lastname,
          email: order.customer_email,
          phone_number: { number: order.customer_phone, country: "bj" },
        },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("FedaPay create transaction failed", res.status, text);
      throw new Error("Échec de l'initialisation du paiement");
    }
    const payload = (await res.json()) as { "v1/transaction": { id: number } };
    const txId = payload["v1/transaction"]?.id;
    if (!txId) throw new Error("Réponse FedaPay invalide");

    // Generate payment token to redirect user to hosted checkout
    const tokenRes = await fetch(`${apiBase}/transactions/${txId}/token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (!tokenRes.ok) throw new Error("Échec génération du lien de paiement");
    const tokenPayload = (await tokenRes.json()) as { token: string; url: string };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("orders")
      .update({ payment_reference: String(txId) })
      .eq("id", order.id);

    return { mode: "redirect" as const, redirectUrl: tokenPayload.url };
  });

/**
 * Retourne une URL signée temporaire pour télécharger un produit
 * numérique acheté. Vérifie que l'utilisateur courant possède bien
 * une commande payée contenant ce fichier.
 */
export const getDigitalDownload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ orderItemId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("order_items")
      .select("id, digital_file_path, product_type, orders!inner(id, user_id, status)")
      .eq("id", data.orderItemId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const order = row && (Array.isArray(row.orders) ? row.orders[0] : row.orders);
    if (!row || !order || order.user_id !== userId) throw new Error("Accès refusé");
    if (order.status !== "paid" && order.status !== "delivered") {
      throw new Error("Paiement non confirmé pour ce produit");
    }
    if (row.product_type !== "digital" || !row.digital_file_path) {
      throw new Error("Ce produit n'a pas de fichier téléchargeable");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("digital-products")
      .createSignedUrl(row.digital_file_path, 60 * 10);
    if (signErr || !signed) throw new Error("Lien de téléchargement indisponible");
    return { url: signed.signedUrl };
  });