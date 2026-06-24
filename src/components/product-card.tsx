import { Link } from "@tanstack/react-router";
import { formatFCFA } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Download, Package } from "lucide-react";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  price_xof: number;
  image_url: string | null;
  type: "physical" | "digital";
  stock: number;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const outOfStock = product.type === "physical" && product.stock <= 0;
  return (
    <Link
      to="/produit/$slug"
      params={{ slug: product.slug }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            <Package className="h-10 w-10" />
          </div>
        )}
        <Badge
          variant="secondary"
          className="absolute left-2 top-2 gap-1 bg-background/90 text-foreground"
        >
          {product.type === "digital" ? <><Download className="h-3 w-3" /> Numérique</> : "Physique"}
        </Badge>
        {outOfStock && (
          <div className="absolute inset-0 grid place-items-center bg-background/70 text-sm font-semibold">
            Rupture de stock
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</h3>
        <p className="mt-auto pt-1 font-display text-base font-bold text-foreground">
          {formatFCFA(product.price_xof)}
        </p>
      </div>
    </Link>
  );
}