import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

type ProjectOption = { id: string; name: string; client_id: string | null; owner_name: string | null };

/**
 * Dialog to link projects to a client (projects.client_id = client.id).
 * Saving first clears the client's other assignments so the selected
 * set is exactly what the client will see in their portal.
 */
export function AssignProjectsDialog({
  client,
  onClose,
}: {
  client: { id: string; name: string } | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // All projects with their current owner (client name), newest first
  const { data: allProjects } = useQuery({
    queryKey: ["assignable-projects"],
    enabled: !!client,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, client_id, client:clients(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as {
        id: string;
        name: string;
        client_id: string | null;
        client: { name: string } | { name: string }[] | null;
      }[]).map<ProjectOption>((p) => {
        const owner = Array.isArray(p.client) ? p.client[0] : p.client;
        return { id: p.id, name: p.name, client_id: p.client_id, owner_name: owner?.name ?? null };
      });
    },
  });

  useEffect(() => {
    if (client && allProjects) {
      setSelected(new Set(allProjects.filter((p) => p.client_id === client.id).map((p) => p.id)));
    }
  }, [client, allProjects]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!client) return null;

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    if (!client) return;
    setSaving(true);
    try {
      const original = new Set(
        (allProjects ?? []).filter((p) => p.client_id === client.id).map((p) => p.id)
      );

      // 1. Unassign projects that were this client's but are now unchecked
      const unassignIds = (allProjects ?? [])
        .filter((p) => p.id && original.has(p.id) && !selected.has(p.id))
        .map((p) => p.id);
      if (unassignIds.length > 0) {
        const { error } = await supabase
          .from("projects")
          .update({ client_id: null })
          .in("id", unassignIds);
        if (error) throw error;
      }

      // 2. Assign the newly checked projects to this client
      const assignIds = Array.from(selected).filter((id) => !original.has(id));
      if (assignIds.length > 0) {
        const { error } = await supabase
          .from("projects")
          .update({ client_id: client.id })
          .in("id", assignIds);
        if (error) throw error;
      }

      toast.success(t("d.clients.projects_updated", "Projets mis à jour"));
      await qc.invalidateQueries({ queryKey: ["client-project-assignments"] });
      await qc.invalidateQueries({ queryKey: ["assignable-projects"] });
      await qc.invalidateQueries({ queryKey: ["module", "projects"] });
      await qc.invalidateQueries({ queryKey: ["portal-projects"] });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update assignments");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!client} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("d.clients.assign_projects", "Assigner des projets")}</DialogTitle>
          <DialogDescription>
            {t("d.clients.assign_projects_desc", "Les projets cochés apparaîtront dans le portail client de {{name}}.", { name: client.name })}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-border p-2">
          {(allProjects ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("d.clients.no_available_projects", "Aucun projet disponible")}
            </p>
          ) : (
            (allProjects ?? []).map((p) => (
              <Label
                key={p.id}
                htmlFor={`assign-project-${p.id}`}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40"
              >
                <Checkbox
                  id={`assign-project-${p.id}`}
                  checked={selected.has(p.id)}
                  onCheckedChange={() => toggle(p.id)}
                />
                <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                {p.owner_name && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {p.owner_name}
                  </span>
                )}
              </Label>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("shared.cancel")}</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? t("shared.saving") : t("shared.save_changes")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
