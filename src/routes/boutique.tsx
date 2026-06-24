import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const searchSchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
});

const boutiqueQuery = queryOptions({
  queryKey: ["boutique"],
  queryFn: async () => {
    const [{ data: products }, { data: categories }] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, slug, price_xof, image_url, type, stock, category_id")
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
      supabase.from("categories").select("id, name, slug").order("name"),
    ]);
    return { products: products ?? [], categories: categories ?? [] };
  },
});

export const Route = createFileRoute("/boutique")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Boutique — YovoShop" },
      { name: "description", content: "Parcourez tout notre catalogue de produits physiques et numériques." },
      { property: "og:title", content: "Boutique — YovoShop" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(boutiqueQuery),
  component: BoutiquePage,
});

function BoutiquePage() {
  const search = Route.useSearch();
  const { data } = useSuspenseQuery(boutiqueQuery);
  const [q, setQ] = useState(search.q ?? "");
  const activeCategory = search.category;

  const filtered = useMemo(() => {
    return data.products.filter((p) => {
      if (activeCategory) {
        const cat = data.categories.find((c) => c.slug === activeCategory);
        if (cat && p.category_id !== cat.id) return false;
      }
      if (q.trim()) {
        if (!p.name.toLowerCase().includes(q.toLowerCase().trim())) return false;
      }
      return true;
    });
  }, [data, activeCategory, q]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Boutique</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {data.products.length} produits disponibles
      </p>

      <div className="mt-5 flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un produit…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/boutique"
            search={{}}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${!activeCategory ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"}`}
          >
            Toutes
          </Link>
          {data.categories.map((c) => (
            <Link
              key={c.id}
              to="/boutique"
              search={{ category: c.slug }}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${activeCategory === c.slug ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"}`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          Aucun produit ne correspond à votre recherche.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}