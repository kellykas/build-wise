import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ModulePage, type Column } from "@/components/app/ModulePage";
import { Wrench } from "lucide-react";
import { EditDialog, type Field } from "@/components/app/EditDialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/equipment")({
  component: EquipmentPage,
});

type Eq = { id: string; name: string; category: string; serial_number: string; status: string; next_maintenance: string | null };

const fields: Field[] = [
  { key: "name", label: "Name", required: true },
  { key: "category", label: "Category" },
  { key: "serial_number", label: "Serial #" },
  { key: "status", label: "Status", type: "select", options: [
    { value: "available", label: "Available" }, { value: "in_use", label: "In use" },
    { value: "maintenance", label: "Maintenance" }, { value: "broken", label: "Broken" },
  ] },
  { key: "next_maintenance", label: "Next maintenance", type: "date" },
];

function EquipmentPage() {
  const [editing, setEditing] = useState<Eq | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const columns: Column<Eq>[] = [
    { key: "name", label: "Equipment", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "category", label: "Category" },
    { key: "serial_number", label: "Serial" },
    { key: "status", label: "Status", render: (r) => <Badge variant="secondary">{r.status}</Badge> },
    { key: "next_maintenance", label: "Next service" },
  ];
  return (
    <>
      <ModulePage<Eq>
        title="Equipment"
        description="Track machinery and maintenance schedules."
        table="equipment"
        columns={columns}
        icon={<span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><Wrench className="h-5 w-5" /></span>}
        onNew={() => { setEditing(null); setNewOpen(true); }}
        onRowClick={(r) => setEditing(r)}
      />
      <EditDialog
        open={newOpen || !!editing}
        onOpenChange={(v) => { if (!v) { setNewOpen(false); setEditing(null); } }}
        table="equipment" title="equipment" fields={fields}
        row={editing as unknown as Record<string, unknown> | null}
      />
    </>
  );
}
