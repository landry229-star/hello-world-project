import { createFileRoute, Link } from "@tanstack/react-router";
import { useCart } from "@/lib/cart-store";
import { Button } from "@/components/ui/button";
import { formatFCFA } from "@/lib/format";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/panier")({
  head: () => ({ meta: [{ title: "Mon panier — YovoShop" }] }),
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-muted">
          <ShoppingBag className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">Votre panier est vide</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Parcourez la boutique pour trouver vos produits favoris.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/boutique">Voir la boutique</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Mon panier</h1>
      <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
        {items.map((it) => (
          <li key={it.productId} className="flex gap-3 p-3">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
              {it.imageUrl ? (
                <img src={it.imageUrl} alt={it.name} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="flex flex-1 flex-col">
              <Link to="/produit/$slug" params={{ slug: it.slug }} className="line-clamp-2 text-sm font-medium hover:underline">
                {it.name}
              </Link>
              <p className="text-sm font-semibold text-accent">{formatFCFA(it.priceXof)}</p>
              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center rounded-full border border-border">
                  <button onClick={() => setQty(it.productId, it.quantity - 1)} className="grid h-8 w-8 place-items-center text-muted-foreground hover:text-foreground">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-7 text-center text-xs font-semibold">{it.quantity}</span>
                  <button onClick={() => setQty(it.productId, it.quantity + 1)} className="grid h-8 w-8 place-items-center text-muted-foreground hover:text-foreground">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button onClick={() => remove(it.productId)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-display text-2xl font-bold">{formatFCFA(total())}</span>
        </div>
        <Button asChild size="lg" className="mt-4 w-full rounded-full">
          <Link to="/checkout">Passer au paiement</Link>
        </Button>
        <Button asChild variant="ghost" className="mt-2 w-full">
          <Link to="/boutique">Continuer mes achats</Link>
        </Button>
      </div>
    </div>
  );
}