import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useCart } from "@/lib/cart-store";
import { formatFCFA } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createOrder } from "@/lib/orders.functions";
import { initPayment } from "@/lib/payments.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const schema = z.object({
  customer_name: z.string().trim().min(2, "Nom requis"),
  customer_phone: z.string().trim().min(8, "Téléphone requis"),
  customer_email: z.string().trim().email("Email invalide"),
  shipping_address: z.string().trim().optional(),
  shipping_city: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  payment_operator: z.enum(["mtn", "moov", "celtiis"]),
});

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Paiement — YovoShop" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const router = useRouter();
  const { items, total, clear } = useCart();
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null);
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    shipping_address: "",
    shipping_city: "",
    notes: "",
    payment_operator: "mtn" as "mtn" | "moov" | "celtiis",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createOrderFn = useServerFn(createOrder);
  const initPaymentFn = useServerFn(initPayment);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (u) {
        setUser({ id: u.id, email: u.email ?? null });
        setForm((f) => ({ ...f, customer_email: u.email ?? "" }));
      }
    });
  }, []);

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          if (issue.path[0]) errs[String(issue.path[0])] = issue.message;
        }
        setErrors(errs);
        throw new Error("Vérifiez le formulaire");
      }
      setErrors({});
      const { orderId } = await createOrderFn({
        data: {
          ...parsed.data,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        },
      });
      const returnUrl = `${window.location.origin}/commande/${orderId}/confirmation`;
      const result = await initPaymentFn({ data: { orderId, returnUrl } });
      return { orderId, ...result };
    },
    onSuccess: (result) => {
      clear();
      if (result.mode === "redirect") {
        window.location.href = result.redirectUrl;
      } else {
        router.navigate({ to: "/commande/$id/confirmation", params: { id: result.orderId } });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p>Votre panier est vide.</p>
        <Button asChild className="mt-4"><Link to="/boutique">Voir la boutique</Link></Button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Connexion requise</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connectez-vous pour finaliser votre commande et suivre sa livraison.
        </p>
        <Button asChild className="mt-6 rounded-full"><Link to="/auth">Me connecter</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Paiement</h1>

      <form
        onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
        className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]"
      >
        <div className="space-y-5">
          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-display text-lg font-semibold">Vos informations</h2>
            <div className="mt-3 grid gap-3">
              <Field label="Nom complet" error={errors.customer_name}>
                <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
              </Field>
              <Field label="Email" error={errors.customer_email}>
                <Input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
              </Field>
              <Field label="Téléphone Mobile Money (+229...)" error={errors.customer_phone}>
                <Input type="tel" placeholder="+229 96 00 00 00" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-display text-lg font-semibold">Livraison</h2>
            <p className="text-xs text-muted-foreground">Pour les produits numériques, vous pourrez les télécharger depuis votre compte.</p>
            <div className="mt-3 grid gap-3">
              <Field label="Adresse">
                <Input value={form.shipping_address} onChange={(e) => setForm({ ...form, shipping_address: e.target.value })} />
              </Field>
              <Field label="Ville">
                <Input value={form.shipping_city} onChange={(e) => setForm({ ...form, shipping_city: e.target.value })} placeholder="Cotonou, Porto-Novo, …" />
              </Field>
              <Field label="Notes (optionnel)">
                <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-display text-lg font-semibold">Opérateur Mobile Money</h2>
            <RadioGroup
              className="mt-3 grid gap-2 sm:grid-cols-3"
              value={form.payment_operator}
              onValueChange={(v) => setForm({ ...form, payment_operator: v as any })}
            >
              {[
                { value: "mtn", label: "MTN MoMo" },
                { value: "moov", label: "Moov Money" },
                { value: "celtiis", label: "Celtiis Cash" },
              ].map((o) => (
                <Label
                  key={o.value}
                  htmlFor={o.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm ${form.payment_operator === o.value ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <RadioGroupItem value={o.value} id={o.value} />
                  {o.label}
                </Label>
              ))}
            </RadioGroup>
          </section>
        </div>

        <aside className="space-y-3 md:sticky md:top-20 md:self-start">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-display text-lg font-semibold">Récapitulatif</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {items.map((i) => (
                <li key={i.productId} className="flex justify-between gap-2">
                  <span className="line-clamp-1">{i.name} × {i.quantity}</span>
                  <span className="shrink-0">{formatFCFA(i.priceXof * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-display text-xl font-bold">{formatFCFA(total())}</span>
            </div>
            <Button type="submit" size="lg" className="mt-4 w-full rounded-full" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Payer maintenant
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Paiement sécurisé via FedaPay
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-medium">{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}