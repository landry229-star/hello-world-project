import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest, getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// In-memory throttle for sensitive admin actions (per-instance best-effort).
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const hits = new Map<string, number[]>();

function throttle(userId: string, action: string) {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (arr.length >= RATE_LIMIT_MAX) {
    throw new Error("Trop de requêtes — veuillez patienter une minute.");
  }
  arr.push(now);
  hits.set(key, arr);
}

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

async function logAudit(params: {
  actorId: string;
  actorEmail?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let ip: string | null = null;
    let ua: string | null = null;
    try {
      ip = getRequestIP({ xForwardedFor: true }) ?? null;
      ua = getRequestHeader("user-agent") ?? null;
    } catch {}
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_id: params.actorId,
      actor_email: params.actorEmail ?? null,
      action: params.action,
      target_type: params.targetType ?? null,
      target_id: params.targetId ?? null,
      metadata: (params.metadata ?? {}) as never,
      ip_address: ip,
      user_agent: ua,
    });
  } catch (e) {
    // Never break the parent action because of audit failure
    console.error("[audit] insert failed", e);
  }
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
    throttle(context.userId, "update_order_status");
    const { error } = await context.supabase
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({
      actorId: context.userId,
      actorEmail: context.claims?.email as string | undefined,
      action: "order.update_status",
      targetType: "order",
      targetId: data.id,
      metadata: { status: data.status },
    });
    return { ok: true };
  });

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("orders")
      .select("id, total_xof, status, created_at, customer_name, customer_phone, customer_email, payment_operator, payment_reference, payment_proof_path, order_items(id, product_name, quantity, unit_price_xof)")
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

export const adminListAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("admin_audit_log")
      .select("id, actor_id, actor_email, action, target_type, target_id, metadata, ip_address, user_agent, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
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
    await logAudit({
      actorId: context.userId,
      actorEmail: context.claims?.email as string | undefined,
      action: "admin.bootstrap",
      targetType: "user_role",
      targetId: context.userId,
    });
    return { ok: true };
  });