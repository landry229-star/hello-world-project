import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createOrderSchema = z.object({
  customer_name: z.string().trim().min(2).max(120),
  customer_phone: z.string().trim().min(8).max(20),
  customer_email: z.string().trim().email().max(255),
  shipping_address: z.string().trim().max(300).optional().nullable(),
  shipping_city: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  payment_operator: z.enum(["mtn", "moov", "celtiis"]).default("mtn"),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(50),
      }),
    )
    .min(1)
    .max(30),
});

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createOrderSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Re-fetch products server-side to validate prices/stock
    const ids = data.items.map((i) => i.productId);
    const { data: products, error: prodErr } = await supabase
      .from("products")
      .select("id, name, price_xof, stock, type, digital_file_path, is_active")
      .in("id", ids);
    if (prodErr) throw new Error(prodErr.message);
    if (!products || products.length !== ids.length) {
      throw new Error("Un ou plusieurs produits sont introuvables.");
    }
    for (const p of products) {
      if (!p.is_active) throw new Error(`Produit indisponible : ${p.name}`);
      const item = data.items.find((i) => i.productId === p.id)!;
      if (p.type === "physical" && p.stock < item.quantity) {
        throw new Error(`Stock insuffisant pour ${p.name}`);
      }
    }

    const total = data.items.reduce((sum, i) => {
      const p = products.find((pp) => pp.id === i.productId)!;
      return sum + p.price_xof * i.quantity;
    }, 0);

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        total_xof: total,
        status: "pending",
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email,
        shipping_address: data.shipping_address ?? null,
        shipping_city: data.shipping_city ?? null,
        notes: data.notes ?? null,
        payment_provider: "fedapay",
        payment_operator: data.payment_operator,
      })
      .select("id")
      .single();
    if (orderErr || !order) throw new Error(orderErr?.message ?? "Création commande impossible");

    const itemRows = data.items.map((i) => {
      const p = products.find((pp) => pp.id === i.productId)!;
      return {
        order_id: order.id,
        product_id: p.id,
        product_name: p.name,
        product_type: p.type,
        digital_file_path: p.digital_file_path,
        quantity: i.quantity,
        unit_price_xof: p.price_xof,
      };
    });
    const { error: itemsErr } = await supabase.from("order_items").insert(itemRows);
    if (itemsErr) throw new Error(itemsErr.message);

    return { orderId: order.id, total };
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("id, total_xof, status, created_at, payment_operator, order_items(id, product_name, quantity, unit_price_xof, product_type, digital_file_path)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Commande introuvable");
    return order;
  });