import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ModulePage } from "@/components/app/ModulePage";
import { Truck } from "lucide-react";
import { EditDialog, type Field } from "@/components/app/EditDialog";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/app/suppliers")({
  component: SuppliersPage,
});

const fields: Field[] = [
  { key: "name", label: "Name", required: true },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone", type: "tel" },
  { key: "address", label: "Address", span: 2 },
  { key: "notes", label: "Notes", type: "textarea", span: 2 },
];

function SuppliersPage() {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  return (
    <>
      <ModulePage
        title={t("d.suppliers.title")}
        description={t("d.suppliers.description")}
        table="suppliers"
        icon={<span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><Truck className="h-5 w-5" /></span>}
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
        ]}
        onNew={() => { setEditing(null); setNewOpen(true); }}
        onRowClick={(r) => setEditing(r)}
      />
      <EditDialog
        open={newOpen || !!editing}
        onOpenChange={(v) => { if (!v) { setNewOpen(false); setEditing(null); } }}
        table="suppliers"
        title={t("d.suppliers.title").toLowerCase()}
        fields={fields}
        row={editing}
      />
    </>
  );
}