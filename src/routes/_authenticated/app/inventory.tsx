import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ModulePage } from "@/components/app/ModulePage";
import { Boxes } from "lucide-react";
import { EditDialog, type Field } from "@/components/app/EditDialog";

export const Route = createFileRoute("/_authenticated/app/inventory")({
  component: InventoryPage,
});

const fields: Field[] = [
  { key: "name", label: "Name", required: true },
  { key: "sku", label: "SKU" },
  { key: "quantity", label: "Quantity", type: "number" },
  { key: "min_quantity", label: "Min quantity", type: "number" },
  { key: "unit_price", label: "Unit price", type: "number", step: "0.01" },
  { key: "status", label: "Status", type: "select", options: [
    { value: "in_stock", label: "In stock" }, { value: "low", label: "Low" }, { value: "out_of_stock", label: "Out of stock" },
  ] },
];

function InventoryPage() {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  return (
    <>
      <ModulePage
        title={t("d.inventory.title")}
        description={t("d.inventory.description")}
        table="inventory_items"
        icon={<span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><Boxes className="h-5 w-5" /></span>}
        columns={[
          { key: "name", label: "Name" },
          { key: "sku", label: "SKU" },
          { key: "quantity", label: "Qty" },
          { key: "unit_price", label: "Price", render: (r: any) => `$${Number(r.unit_price || 0).toLocaleString()}` },
          { key: "status", label: "Status" },
        ]}
        onNew={() => { setEditing(null); setNewOpen(true); }}
        onRowClick={(r) => setEditing(r)}
      />
      <EditDialog
        open={newOpen || !!editing}
        onOpenChange={(v) => { if (!v) { setNewOpen(false); setEditing(null); } }}
        table="inventory_items"
        title={t("d.inventory.item")}
        fields={fields}
        row={editing}
      />
    </>
  );
}