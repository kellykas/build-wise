import { createFileRoute } from "@tanstack/react-router";
import { ModulePage, type Column } from "@/components/app/ModulePage";
import { Boxes } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Row = { id: string; sku: string | null; name: string; category: string | null; quantity: number; min_quantity: number; unit: string | null; unit_cost: number };

export const Route = createFileRoute("/_authenticated/app/inventory")({
  component: () => (
    <ModulePage<Row>
      title="Inventory"
      description="Materials, consumables and tools across all sites."
      table="inventory_items"
      icon={<span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><Boxes className="h-5 w-5" /></span>}
      onNew={() => toast.info("Item form coming soon")}
      columns={[
        { key: "sku", label: "SKU" },
        { key: "name", label: "Item" },
        { key: "category", label: "Category" },
        { key: "quantity", label: "Qty", render: (r) => `${r.quantity} ${r.unit ?? ""}` },
        { key: "min_quantity", label: "Status", render: (r) => (
          Number(r.quantity) <= Number(r.min_quantity)
            ? <Badge className="bg-warning/15 text-warning">Low stock</Badge>
            : <Badge className="bg-success/15 text-success">OK</Badge>
        )},
        { key: "unit_cost", label: "Unit cost", render: (r) => `$${Number(r.unit_cost).toFixed(2)}` },
      ]}
    />
  ),
});
