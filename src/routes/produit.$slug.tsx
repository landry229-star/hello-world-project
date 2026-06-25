import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatFCFA } from "@/lib/format";
import { useCart } from "@/lib/cart-store";
import { Minus, Plus, ShoppingBag, ArrowLeft, Download, Package } from "lucide-react";
import { toast } from "sonner";

const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, description, price_xof, image_url, stock, type, is_active")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const Route = createFileRoute("/produit/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(productQuery(params.slug));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} — LandryShop` },
          { name: "description", content: (loaderData.description ?? "").slice(0, 160) || `Acheter ${loaderData.name} en ligne au Bénin.` },
          { property: "og:title", content: loaderData.name },
          { property: "og:description", content: (loaderData.description ?? "").slice(0, 160) },
          ...(loaderData.image_url ? [{ property: "og:image", content: loaderData.image_url }] : []),
        ]
      : [{ title: "Produit — LandryShop" }],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="font-display text-2xl font-bold">Produit introuvable</h1>
      <Button asChild className="mt-4">
        <Link to="/boutique">Retour à la boutique</Link>
      </Button>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="text-sm text-destructive">{error.message}</p>
    </div>
  ),
  component: ProductPage,
});

function ProductPage() {
  const params = Route.useParams();
  const router = useRouter();
  const { data: product } = useSuspenseQuery(productQuery(params.slug));
  const add = useCart((s) => s.add);
  const [qty, setQty] = useState(1);

  if (!product) return null;
  const outOfStock = product.type === "physical" && product.stock <= 0;

  function handleAdd() {
    if (!product) return;
    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        priceXof: product.price_xof,
        imageUrl: product.image_url,
        type: product.type,
      },
      qty,
    );
    toast.success("Ajouté au panier");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <button
        onClick={() => router.history.back()}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-3xl bg-muted">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground">
              <Package className="h-16 w-16" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Badge variant="secondary" className="w-fit gap-1">
            {product.type === "digital" ? <><Download className="h-3 w-3" /> Produit numérique</> : "Produit physique"}
          </Badge>
          <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">{product.name}</h1>
          <p className="font-display text-3xl font-bold text-accent">{formatFCFA(product.price_xof)}</p>
          {product.description && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          {product.type === "physical" && (
            <p className="text-xs text-muted-foreground">
              {product.stock > 0 ? `${product.stock} en stock` : "Rupture de stock"}
            </p>
          )}

          {!outOfStock && (
            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center rounded-full border border-border">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="grid h-10 w-10 place-items-center text-muted-foreground hover:text-foreground"
                  aria-label="Diminuer"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="grid h-10 w-10 place-items-center text-muted-foreground hover:text-foreground"
                  aria-label="Augmenter"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <Button size="lg" onClick={handleAdd} className="flex-1 rounded-full">
                <ShoppingBag className="mr-2 h-4 w-4" /> Ajouter au panier
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}