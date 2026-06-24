import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Accès admin requis");
}

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum([
          "pending",
          "paid",
          "failed",
          "preparing",
          "shipped",
          "delivered",
          "cancelled",
        ]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("orders")
      .select("id, total_xof, status, created_at, customer_name, customer_phone, customer_email, payment_operator, order_items(id, product_name, quantity, unit_price_xof)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [{ data: orders }, { data: products }] = await Promise.all([
      context.supabase.from("orders").select("total_xof, status, created_at"),
      context.supabase.from("products").select("id, stock"),
    ]);
    const paid = (orders ?? []).filter((o: any) => o.status === "paid" || o.status === "delivered" || o.status === "shipped" || o.status === "preparing");
    const revenue = paid.reduce((s: number, o: any) => s + o.total_xof, 0);
    return {
      ordersCount: orders?.length ?? 0,
      paidCount: paid.length,
      revenueXof: revenue,
      productsCount: products?.length ?? 0,
      lowStock: (products ?? []).filter((p: any) => p.stock <= 3).length,
    };
  });

/**
 * Permet à un utilisateur de se promouvoir admin si AUCUN admin n'existe encore.
 * Utilisé une seule fois après le premier signup pour bootstrap.
 */
export const bootstrapAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    if ((count ?? 0) > 0) {
      throw new Error("Un administrateur existe déjà.");
    }
    const { error: insertErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (insertErr) throw new Error(insertErr.message);
    return { ok: true };
  });