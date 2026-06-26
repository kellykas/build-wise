import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ModulePage, type Column } from "@/components/app/ModulePage";
import { FolderKanban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/projects")({
  component: ProjectsPage,
});

type Project = {
  id: string; name: string; project_number: string | null;
  location: string | null; status: string; priority: string;
  budget: number; progress: number; start_date: string | null; end_date: string | null;
};

const statusColors: Record<string, string> = {
  planning: "bg-muted text-foreground",
  pending: "bg-warning/15 text-warning",
  in_progress: "bg-primary/15 text-primary",
  on_hold: "bg-muted text-muted-foreground",
  completed: "bg-success/15 text-success",
  cancelled: "bg-destructive/15 text-destructive",
};

function ProjectsPage() {
  const [open, setOpen] = useState(false);
  const { profile } = useAuth();
  const qc = useQueryClient();

  const onCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile?.company_id) return toast.error("No workspace");
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("projects").insert({
      company_id: profile.company_id,
      name: String(fd.get("name")),
      location: String(fd.get("location") || "") || null,
      budget: Number(fd.get("budget") || 0),
      description: String(fd.get("description") || "") || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Project created");
    qc.invalidateQueries({ queryKey: ["module", "projects"] });
    qc.invalidateQueries({ queryKey: ["dashboard-counts"] });
    setOpen(false);
  };

  const columns: Column<Project>[] = [
    { key: "name", label: "Project", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "location", label: "Location" },
    { key: "status", label: "Status", render: (r) => (
      <Badge variant="secondary" className={statusColors[r.status] ?? ""}>{r.status.replace("_", " ")}</Badge>
    )},
    { key: "budget", label: "Budget", render: (r) => `$${Number(r.budget).toLocaleString()}` },
    { key: "progress", label: "Progress", render: (r) => (
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${r.progress}%` }} /></div>
        <span className="text-xs text-muted-foreground">{r.progress}%</span>
      </div>
    )},
  ];

  return (
    <>
      <ModulePage<Project>
        title="Projects"
        description="All projects across your portfolio."
        table="projects"
        columns={columns}
        icon={<span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><FolderKanban className="h-5 w-5" /></span>}
        onNew={() => setOpen(true)}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
          <form onSubmit={onCreate} className="space-y-4">
            <div><Label>Project name</Label><Input required name="name" className="mt-1" /></div>
            <div><Label>Location</Label><Input name="location" className="mt-1" /></div>
            <div><Label>Budget (USD)</Label><Input name="budget" type="number" min="0" className="mt-1" /></div>
            <div><Label>Description</Label><Textarea name="description" rows={3} className="mt-1" /></div>
            <DialogFooter><Button type="submit">Create</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
