import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Smartphone, Truck } from "lucide-react";

const homeQuery = queryOptions({
  queryKey: ["home-data"],
  queryFn: async () => {
    const [{ data: featured }, { data: categories }] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, slug, price_xof, image_url, type, stock")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(8),
      supabase.from("categories").select("id, name, slug, image_url").order("name").limit(8),
    ]);
    return { featured: featured ?? [], categories: categories ?? [] };
  },
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LandryShop — Boutique en ligne au Bénin" },
      { name: "description", content: "Mode, artisanat, produits numériques. Paiement Mobile Money MTN et Moov. Livraison à Cotonou et partout au Bénin." },
      { property: "og:title", content: "LandryShop — Boutique Bénin" },
      { property: "og:description", content: "Achetez en ligne au Bénin avec paiement Mobile Money." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  component: HomePage,
});

function HomePage() {
  const { data } = useSuspenseQuery(homeQuery);
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/15 via-background to-accent/10" />
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-2 md:py-20">
          <div className="flex flex-col justify-center gap-5">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-foreground">
              <Smartphone className="h-3.5 w-3.5" /> Paiement MTN MoMo & Moov Money
            </span>
            <h1 className="font-display text-4xl font-bold leading-tight md:text-6xl">
              La boutique en ligne <span className="text-accent">faite pour le Bénin</span>.
            </h1>
            <p className="max-w-lg text-base text-muted-foreground md:text-lg">
              Découvrez nos produits soigneusement sélectionnés et payez en quelques secondes avec votre Mobile Money.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full px-6">
                <Link to="/boutique">
                  Voir la boutique <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-6">
                <Link to="/auth">Créer un compte</Link>
              </Button>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="relative aspect-square rounded-3xl bg-gradient-to-br from-primary/30 via-accent/30 to-background p-1">
              <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-3 rounded-[1.4rem] bg-background p-3">
                {data.featured.slice(0, 4).map((p) => (
                  <Link
                    key={p.id}
                    to="/produit/$slug"
                    params={{ slug: p.slug }}
                    className="overflow-hidden rounded-2xl bg-muted"
                  >
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">{p.name}</div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Smartphone, title: "Mobile Money", desc: "MTN, Moov, Celtiis." },
            { icon: Truck, title: "Livraison Bénin", desc: "Cotonou et villes." },
            { icon: ShieldCheck, title: "Paiement sécurisé", desc: "Via FedaPay." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-4">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-display font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {data.categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-6">
          <h2 className="font-display text-2xl font-bold">Catégories</h2>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {data.categories.map((c) => (
              <Link
                key={c.id}
                to="/boutique"
                search={{ category: c.slug }}
                className="shrink-0 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold">Nos produits</h2>
          <Link to="/boutique" className="text-sm font-medium text-accent hover:underline">
            Tout voir
          </Link>
        </div>
        {data.featured.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            Aucun produit pour le moment. Ajoutez-en depuis l'espace admin.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {data.featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
