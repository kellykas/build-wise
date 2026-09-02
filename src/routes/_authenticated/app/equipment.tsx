import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ModulePage } from "@/components/app/ModulePage";
import { Wrench } from "lucide-react";
import { EditDialog, type Field } from "@/components/app/EditDialog";

export const Route = createFileRoute("/_authenticated/app/equipment")({
  component: EquipmentPage,
});

const fields: Field[] = [
  { key: "name", label: "Name", required: true },
  { key: "type", label: "Type" },
  { key: "status", label: "Status", type: "select", options: [
    { value: "available", label: "Available" }, { value: "in_use", label: "In use" }, { value: "maintenance", label: "Maintenance" },
  ] },
  { key: "last_maintenance", label: "Last maintenance", type: "date" },
  { key: "next_maintenance", label: "Next maintenance", type: "date" },
  { key: "notes", label: "Notes", type: "textarea", span: 2 },
];

function EquipmentPage() {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  return (
    <>
      <ModulePage
        title={t("d.equipment.title")}
        description={t("d.equipment.description")}
        table="equipment"
        icon={<span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><Wrench className="h-5 w-5" /></span>}
        columns={[
          { key: "name", label: "Name" },
          { key: "type", label: "Type" },
          { key: "status", label: "Status" },
          { key: "next_maintenance", label: "Next maintenance" },
        ]}
        onNew={() => { setEditing(null); setNewOpen(true); }}
        onRowClick={(r) => setEditing(r)}
      />
      <EditDialog
        open={newOpen || !!editing}
        onOpenChange={(v) => { if (!v) { setNewOpen(false); setEditing(null); } }}
        table="equipment"
        title={t("d.equipment.equipment")}
        fields={fields}
        row={editing}
      />
    </>
  );
}