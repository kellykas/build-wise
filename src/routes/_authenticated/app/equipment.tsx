import { createFileRoute } from "@tanstack/react-router";
import { ModulePage, type Column } from "@/components/app/ModulePage";
import { Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const tone: Record<string, string> = {
  available: "bg-success/15 text-success",
  assigned: "bg-primary/15 text-primary",
  maintenance: "bg-warning/15 text-warning",
  out_of_service: "bg-destructive/15 text-destructive",
};

export const Route = createFileRoute("/_authenticated/app/equipment")({
  component: () => (
    <ModulePage
      title="Equipment"
      description="Vehicles, machinery and tools fleet."
      table="equipment"
      icon={<span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><Wrench className="h-5 w-5" /></span>}
      onNew={() => toast.info("Equipment form coming soon")}
      columns={[
        { key: "name", label: "Asset" },
        { key: "category", label: "Category" },
        { key: "serial_number", label: "Serial #" },
        { key: "status", label: "Status", render: (r: { status: string }) => <Badge className={tone[r.status] ?? ""}>{r.status.replace("_", " ")}</Badge> },
        { key: "next_maintenance", label: "Next service" },
      ] satisfies Column<{ id: string; status: string }>[]}
    />
  ),
});
