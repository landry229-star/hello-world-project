import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminListAuditLog } from "@/lib/admin.functions";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  component: AuditPage,
});

function AuditPage() {
  const fn = useServerFn(adminListAuditLog);
  const { data, isLoading } = useQuery({ queryKey: ["admin-audit"], queryFn: () => fn() });

  if (isLoading) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement du journal…</p>;
  if (!data || data.length === 0) {
    return <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Aucune action enregistrée pour l'instant.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <ShieldAlert className="h-5 w-5 text-primary" />
        <div>
          <p className="font-display font-semibold">Journal d'audit</p>
          <p className="text-xs text-muted-foreground">Toutes les actions sensibles effectuées dans la console — non modifiables.</p>
        </div>
      </div>
      <ul className="space-y-2">
        {data.map((row: any) => (
          <li key={row.id} className="rounded-2xl border border-border bg-card p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">{row.action}</Badge>
                {row.target_type && (
                  <span className="text-xs text-muted-foreground">{row.target_type} · <span className="font-mono">{String(row.target_id).slice(0, 8)}</span></span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString("fr-FR")}</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              <span>Par {row.actor_email ?? row.actor_id?.slice(0, 8) ?? "—"}</span>
              {row.ip_address && <span> · IP {row.ip_address}</span>}
            </div>
            {row.metadata && Object.keys(row.metadata).length > 0 && (
              <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-2 text-[11px]">{JSON.stringify(row.metadata, null, 2)}</pre>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}