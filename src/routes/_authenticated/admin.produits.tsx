import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { slugify, formatFCFA } from "@/lib/format";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/produits")({
  component: ProductsAdmin,
});

type ProductForm = {
  name: string;
  description: string;
  price_xof: string;
  stock: string;
  type: "physical" | "digital";
  category_id: string | null;
  is_active: boolean;
  is_featured: boolean;
};

const emptyForm: ProductForm = {
  name: "", description: "", price_xof: "", stock: "0",
  type: "physical", category_id: null, is_active: true, is_featured: false,
};

function ProductsAdmin() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [digitalFile, setDigitalFile] = useState<File | null>(null);
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [existingDigital, setExistingDigital] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["admin-categories-list"],
    queryFn: async () => (await supabase.from("categories").select("id, name").order("name")).data ?? [],
  });

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null); setDigitalFile(null);
    setExistingImage(null); setExistingDigital(null);
    setOpen(true);
  }

  function startEdit(p: any) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description ?? "",
      price_xof: String(p.price_xof),
      stock: String(p.stock),
      type: p.type,
      category_id: p.category_id,
      is_active: p.is_active,
      is_featured: p.is_featured,
    });
    setExistingImage(p.image_url);
    setExistingDigital(p.digital_file_path);
    setImageFile(null); setDigitalFile(null);
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim() || !form.price_xof) {
      toast.error("Nom et prix requis");
      return;
    }
    setSaving(true);
    try {
      let image_url = existingImage;
      let digital_file_path = existingDigital;

      if (imageFile) {
        const path = `${crypto.randomUUID()}-${imageFile.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
        const { error } = await supabase.storage.from("product-images").upload(path, imageFile, { upsert: false });
        if (error) throw error;
        // Le bucket est privé (politique workspace) : on génère une URL signée longue durée
        // qui reste accessible publiquement sans authentification.
        const { data: signed, error: signErr } = await supabase.storage
          .from("product-images")
          .createSignedUrl(path, 60 * 60 * 24 * 365 * 5); // 5 ans
        if (signErr || !signed) throw signErr ?? new Error("URL image indisponible");
        image_url = signed.signedUrl;
      }

      if (digitalFile && form.type === "digital") {
        const path = `${crypto.randomUUID()}-${digitalFile.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
        const { error } = await supabase.storage.from("digital-products").upload(path, digitalFile, { upsert: false });
        if (error) throw error;
        digital_file_path = path;
      }

      const payload = {
        name: form.name.trim(),
        slug: slugify(form.name) + (editingId ? "" : "-" + Math.random().toString(36).slice(2, 6)),
        description: form.description.trim() || null,
        price_xof: parseInt(form.price_xof, 10),
        stock: parseInt(form.stock, 10) || 0,
        type: form.type,
        category_id: form.category_id,
        is_active: form.is_active,
        is_featured: form.is_featured,
        image_url,
        digital_file_path: form.type === "digital" ? digital_file_path : null,
      };

      if (editingId) {
        const { slug, ...update } = payload;
        const { error } = await supabase.from("products").update(update).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
      toast.success("Enregistré");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["home-data"] });
      qc.invalidateQueries({ queryKey: ["boutique"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Supprimé"); qc.invalidateQueries({ queryKey: ["admin-products"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startCreate}><Plus className="mr-1 h-4 w-4" /> Nouveau produit</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Modifier" : "Nouveau"} produit</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs">Nom</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label className="text-xs">Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Prix (FCFA)</Label><Input type="number" min="0" value={form.price_xof} onChange={(e) => setForm({ ...form, price_xof: e.target.value })} /></div>
                <div><Label className="text-xs">Stock</Label><Input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} disabled={form.type === "digital"} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as "physical" | "digital" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="physical">Physique</SelectItem>
                      <SelectItem value="digital">Numérique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Catégorie</Label>
                  <Select value={form.category_id ?? "none"} onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Aucune —</SelectItem>
                      {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Image</Label>
                <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
                {existingImage && !imageFile && <img src={existingImage} alt="" className="mt-2 h-20 w-20 rounded object-cover" />}
              </div>
              {form.type === "digital" && (
                <div>
                  <Label className="text-xs">Fichier numérique</Label>
                  <Input type="file" onChange={(e) => setDigitalFile(e.target.files?.[0] ?? null)} />
                  {existingDigital && !digitalFile && <p className="mt-1 text-xs text-muted-foreground">Fichier actuel : {existingDigital}</p>}
                </div>
              )}
              <div className="flex items-center justify-between"><Label className="text-xs">Actif</Label><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
              <div className="flex items-center justify-between"><Label className="text-xs">Mis en avant</Label><Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : !products || products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Aucun produit. Ajoutez votre premier produit.
        </div>
      ) : (
        <ul className="space-y-2">
          {products.map((p: any) => (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFCFA(p.price_xof)} · {p.type === "digital" ? "Numérique" : `Stock ${p.stock}`}
                  {!p.is_active && " · inactif"}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => startEdit(p)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => { if (confirm("Supprimer ?")) deleteMutation.mutate(p.id); }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}