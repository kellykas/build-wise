import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { notifyTaskAssigned } from "@/lib/notifications";

export type Field = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "email" | "tel" | "select" | "time";
  options?: { value: string; label: string }[];
  required?: boolean;
  step?: string;
  min?: string;
  placeholder?: string;
  span?: 1 | 2;
};

export function EditDialog({
  open, onOpenChange, table, title, fields, row, invalidate, includeCompanyId = true, extra,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  table: string;
  title: string;
  fields: Field[];
  row?: Record<string, unknown> | null;
  invalidate?: string[];
  includeCompanyId?: boolean;
  extra?: Record<string, unknown>;
}) {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const isEdit = !!row?.id;

  useEffect(() => {
    if (open) {
      const init: Record<string, unknown> = {};
      fields.forEach((f) => { init[f.key] = (row?.[f.key] ?? "") as unknown; });
      setValues(init);
    }
  }, [open, row, fields]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: Record<string, unknown> = { ...values, ...(extra ?? {}) };
    if (includeCompanyId && !isEdit) payload.company_id = profile?.company_id;
    // normalize empty strings to null
    Object.keys(payload).forEach((k) => { if (payload[k] === "") payload[k] = null; });
    const q = isEdit
      ? supabase.from(table as never).update(payload as never).eq("id", row!.id as string)
      : supabase.from(table as never).insert(payload as never);
    const { data: result, error } = await q;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(isEdit ? "Updated" : "Created");

    // Send notification when a task is created with an assignee
    if (!isEdit && table === "tasks" && values.assigned_to && profile?.company_id) {
      const assigneeId = values.assigned_to as string;
      await notifyTaskAssigned({
        companyId: profile.company_id,
        senderId: null,
        assigneeId,
        taskName: (values.name as string) || "New task",
        dueDate: values.due_date as string | null,
      });
    }

    (invalidate ?? [`module:${table}`]).forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    qc.invalidateQueries({ queryKey: ["module", table] });
    qc.invalidateQueries({ queryKey: ["dashboard-counts"] });
    onOpenChange(false);
  };

  const onDelete = async () => {
    if (!isEdit) return;
    if (!confirm("Delete this record? This cannot be undone.")) return;
    const { error } = await supabase.from(table as never).delete().eq("id", row!.id as string);
    if (error) {
      const msg = error.message.includes("foreign key constraint")
        ? "Cannot delete: this record is referenced by other records (invoices, projects, etc.). Remove those references first."
        : error.message;
      return toast.error(msg);
    }
    toast.success("Deleted");
    (invalidate ?? [`module:${table}`]).forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    qc.invalidateQueries({ queryKey: ["module", table] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${title}` : `New ${title}`}</DialogTitle>
          <DialogDescription>{isEdit ? "Update record details." : "Create a new record."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((f) => {
            const val = values[f.key] ?? "";
            const setVal = (v: unknown) => setValues((s) => ({ ...s, [f.key]: v }));
            const wrap = f.span === 2 || f.type === "textarea" ? "sm:col-span-2" : "";
            return (
              <div key={f.key} className={wrap}>
                <Label className="text-xs font-medium">{f.label}{f.required && " *"}</Label>
                {f.type === "textarea" ? (
                  <Textarea className="mt-1" value={String(val ?? "")} onChange={(e) => setVal(e.target.value)} rows={3} required={f.required} placeholder={f.placeholder} />
                ) : f.type === "select" ? (
                  <Select value={String(val ?? "")} onValueChange={(v) => setVal(v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={f.placeholder ?? "Select..."} /></SelectTrigger>
                    <SelectContent>
                      {f.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    className="mt-1"
                    type={f.type ?? "text"}
                    value={String(val ?? "")}
                    onChange={(e) => setVal(f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
                    required={f.required}
                    step={f.step}
                    min={f.min}
                    placeholder={f.placeholder}
                  />
                )}
              </div>
            );
          })}
          <DialogFooter className="sm:col-span-2 flex !justify-between gap-2">
            <div>
              {isEdit && (
                <Button type="button" variant="destructive" onClick={onDelete}>Delete</Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : isEdit ? "Save changes" : "Create"}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
