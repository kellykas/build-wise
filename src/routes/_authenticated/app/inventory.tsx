import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ModulePage, type Column } from "@/components/app/ModulePage";
import { Boxes } from "lucide-react";
import { EditDialog, type Field } from "@/components/app/EditDialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/inventory")({
  component: InventoryPage,
});

type Item = { id: string; sku: string; name: string; category: string; quantity: number; min_quantity: number; unit_cost: number; status: string; location: string };

const fields: Field[] = [
  { key: "sku", label: "SKU", required: true },
  { key: "name", label: "Name", required: true },
  { key: "category", label: "Category" },
  { key: "unit", label: "Unit" },
  { key: "quantity", label: "Quantity", type: "number", step: "0.01" },
  { key: "min_quantity", label: "Min quantity", type: "number", step: "0.01" },
  { key: "unit_cost", label: "Unit cost", type: "number", step: "0.01" },
  { key: "location", label: "Location" },
  { key: "status", label: "Status", type: "select", options: [
    { value: "in_stock", label: "In stock" }, { value: "low", label: "Low" }, { value: "out", label: "Out of stock" },
  ] },
];

function InventoryPage() {
  const [editing, setEditing] = useState<Item | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const columns: Column<Item>[] = [
    { key: "sku", label: "SKU" },
    { key: "name", label: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "category", label: "Category" },
    { key: "quantity", label: "Qty", render: (r) => `${r.quantity}` },
    { key: "unit_cost", label: "Unit cost", render: (r) => `$${Number(r.unit_cost).toLocaleString()}` },
    { key: "status", label: "Status", render: (r) => <Badge variant="secondary">{r.status ?? "in_stock"}</Badge> },
  ];

  return (
    <>
      <ModulePage<Item>
        title="Inventory"
        description="Edit stock levels, status and pricing. Click any row to edit."
        table="inventory_items"
        columns={columns}
        icon={<span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><Boxes className="h-5 w-5" /></span>}
        onNew={() => { setEditing(null); setNewOpen(true); }}
        onRowClick={(r) => setEditing(r)}
      />
      <EditDialog
        open={newOpen || !!editing}
        onOpenChange={(v) => { if (!v) { setNewOpen(false); setEditing(null); } }}
        table="inventory_items" title="item" fields={fields}
        row={editing as unknown as Record<string, unknown> | null}
      />
    </>
  );
}
