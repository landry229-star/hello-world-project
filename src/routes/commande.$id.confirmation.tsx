import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { getOrder } from "@/lib/orders.functions";
import { submitPaymentProof, initPayment, verifyPayment } from "@/lib/payments.functions";
import { formatFCFA } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, Loader2, Receipt, Copy, Smartphone, Upload, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { MERCHANT_ACCOUNTS, type Operator } from "@/lib/payment-config";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/commande/$id/confirmation")({
  head: () => ({ meta: [{ title: "Confirmation de commande — LandryShop" }] }),
  component: ConfirmationPage,
});

function ConfirmationPage() {
  const { id } = Route.useParams();
  const getOrderFn = useServerFn(getOrder);
  const submitProofFn = useServerFn(submitPaymentProof);
  const initPaymentFn = useServerFn(initPayment);
  const verifyPaymentFn = useServerFn(verifyPayment);
  const [txRef, setTxRef] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrderFn({ data: { id } }),
    refetchInterval: (q) => {
      const o: any = q.state.data;
      return o && o.status === "pending" ? 10000 : false;
    },
  });
  const submitMutation = useMutation({
    mutationFn: async () => {
      let proofPath: string | undefined;
      if (proofFile) {
        setUploading(true);
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData.user) throw new Error("Session expirée. Reconnectez-vous.");
        const ext = proofFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${userData.user.id}/${id}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("payment-proofs")
          .upload(path, proofFile, { upsert: false, contentType: proofFile.type });
        setUploading(false);
        if (upErr) throw new Error(`Échec envoi du fichier : ${upErr.message}`);
        proofPath = path;
      }
      return submitProofFn({ data: { orderId: id, transactionRef: txRef, proofPath } });
    },
    onSuccess: () => {
      toast.success("Preuve envoyée. Nous validons votre paiement sous peu.");
      setProofFile(null);
      refetch();
    },
    onError: (e: Error) => { setUploading(false); toast.error(e.message); },
  });
  const payMutation = useMutation({
    mutationFn: async () => {
      const returnUrl = typeof window !== "undefined" ? window.location.href : "https://example.com";
      return initPaymentFn({ data: { orderId: id, returnUrl } });
    },
    onSuccess: (res: { mode: string; redirectUrl: string }) => {
      if (res.mode === "redirect") {
        window.location.href = res.redirectUrl;
      } else if (res.mode === "demo") {
        toast.success("Paiement simulé (mode démo). Commande marquée payée.");
        refetch();
      } else {
        refetch();
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const verifyMutation = useMutation({
    mutationFn: () => verifyPaymentFn({ data: { orderId: id } }),
    onSuccess: () => refetch(),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !order) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-sm text-destructive">{(error as Error)?.message ?? "Commande introuvable"}</p>
        <Button asChild className="mt-4"><Link to="/">Accueil</Link></Button>
      </div>
    );
  }

  const isPaid = order.status === "paid" || order.status === "delivered" || order.status === "shipped" || order.status === "preparing";
  const isFailed = order.status === "failed" || order.status === "cancelled";
  const provider = ((order as { payment_provider?: string | null }).payment_provider ?? "manual") as
    | "manual" | "fedapay" | "kkiapay";
  const operator = (order.payment_operator ?? "mtn") as Operator;
  const account = MERCHANT_ACCOUNTS[operator];
  const copy = (v: string, label: string) => {
    navigator.clipboard?.writeText(v).then(() => toast.success(`${label} copié`));
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-3xl border border-border bg-card p-6 text-center">
        {isPaid ? (
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
        ) : isFailed ? (
          <XCircle className="mx-auto h-14 w-14 text-destructive" />
        ) : (
          <Clock className="mx-auto h-14 w-14 text-primary" />
        )}
        <h1 className="mt-3 font-display text-2xl font-bold">
          {isPaid ? "Commande confirmée !" : isFailed ? "Paiement échoué" : "En attente de paiement"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isPaid
            ? "Merci pour votre achat. Vous recevrez bientôt des nouvelles."
            : isFailed
              ? "Le paiement n'a pas abouti. Vous pouvez réessayer depuis votre compte."
              : "Suivez les instructions ci-dessous pour effectuer le paiement Mobile Money."}
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Référence : <span className="font-mono">{order.id.slice(0, 8).toUpperCase()}</span>
        </p>
      </div>

      {!isPaid && !isFailed && provider === "manual" && (
        <div className="mt-6 rounded-2xl border-2 border-primary/30 bg-primary/5 p-5">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Instructions {account.label}</h2>
          </div>
          <ol className="mt-3 space-y-3 text-sm">
            <li>
              <span className="font-medium">1. Composez</span> <span className="font-mono">{account.ussd}</span> sur votre téléphone et choisissez « Transfert d'argent ».
            </li>
            <li>
              <span className="font-medium">2. Envoyez</span> le montant exact au numéro marchand :
              <div className="mt-2 grid gap-2 rounded-xl border border-border bg-card p-3">
                <Row label="Numéro" value={account.number} onCopy={() => copy(account.number, "Numéro")} />
                <Row label="Nom" value={account.holder} onCopy={() => copy(account.holder, "Nom")} />
                <Row
                  label="Montant"
                  value={formatFCFA(order.total_xof)}
                  onCopy={() => copy(String(order.total_xof), "Montant")}
                />
                <Row
                  label="Motif"
                  value={order.id.slice(0, 8).toUpperCase()}
                  onCopy={() => copy(order.id.slice(0, 8).toUpperCase(), "Motif")}
                />
              </div>
            </li>
            <li>
              <span className="font-medium">3. Saisissez</span> l'ID de transaction (SMS de confirmation) ci-dessous. Nous validerons manuellement votre paiement.
            </li>
          </ol>

          <div className="mt-4 space-y-2">
            <Label htmlFor="tx-ref" className="text-xs">ID de transaction Mobile Money</Label>
            <div className="flex gap-2">
              <Input
                id="tx-ref"
                placeholder="Ex : 1234567890"
                value={txRef}
                onChange={(e) => setTxRef(e.target.value)}
              />
            </div>

            <Label htmlFor="proof-file" className="mt-3 block text-xs">
              Capture SMS ou photo de reçu (facultatif mais recommandé)
            </Label>
            <label
              htmlFor="proof-file"
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-3 py-4 text-sm text-muted-foreground hover:border-primary hover:text-foreground"
            >
              {proofFile ? (
                <>
                  <ImageIcon className="h-4 w-4" />
                  <span className="truncate">{proofFile.name}</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Choisir une image (JPG, PNG, ≤ 5 Mo)</span>
                </>
              )}
            </label>
            <input
              id="proof-file"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && f.size > 5 * 1024 * 1024) {
                  toast.error("Fichier trop volumineux (max 5 Mo)");
                  return;
                }
                setProofFile(f);
              }}
            />

            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || uploading || txRef.trim().length < 3}
              className="w-full rounded-full"
            >
              {(submitMutation.isPending || uploading) && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              {uploading ? "Envoi de la preuve…" : "Envoyer ma preuve de paiement"}
            </Button>

            {order.payment_reference && (
              <p className="text-xs text-muted-foreground">
                Référence envoyée : <span className="font-mono">{order.payment_reference}</span> — en attente de validation.
              </p>
            )}
          </div>
        </div>
      )}

      {!isPaid && !isFailed && provider !== "manual" && (
        <div className="mt-6 rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 text-center">
          <h2 className="font-display text-lg font-semibold">
            Paiement {provider === "fedapay" ? "FedaPay" : "KKiaPay"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cliquez pour payer en ligne via {provider === "fedapay" ? "FedaPay" : "KKiaPay"}.
            Vous serez redirigé vers la page de paiement sécurisée.
          </p>
          <Button
            onClick={() => payMutation.mutate()}
            disabled={payMutation.isPending}
            size="lg"
            className="mt-4 rounded-full"
          >
            {payMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Payer maintenant
          </Button>
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => verifyMutation.mutate()}
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              J'ai déjà payé — vérifier
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Détails</h2>
          <Badge variant="secondary">{order.status}</Badge>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {(order.order_items as Array<{ id: string; product_name: string; quantity: number; unit_price_xof: number }>).map((it) => (
            <li key={it.id} className="flex justify-between">
              <span>{it.product_name} × {it.quantity}</span>
              <span>{formatFCFA(it.unit_price_xof * it.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-border pt-3 font-display text-lg font-bold">
          <span>Total</span><span>{formatFCFA(order.total_xof)}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild className="rounded-full"><Link to="/compte">Retour à mon espace</Link></Button>
        <Button asChild variant="outline" className="rounded-full"><Link to="/boutique">Continuer mes achats</Link></Button>
        {isPaid && (
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/commande/$id/recu" params={{ id }}>
              <Receipt className="mr-1 h-3 w-3" /> Voir le reçu
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-medium">{value}</span>
        <button
          type="button"
          onClick={onCopy}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Copier ${label}`}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}