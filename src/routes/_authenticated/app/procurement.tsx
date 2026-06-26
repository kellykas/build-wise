import { createFileRoute } from "@tanstack/react-router";
import { ModulePage, type Column } from "@/components/app/ModulePage";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/procurement")({
  component: () => (
    <ModulePage
      title="Procurement"
      description="Purchase orders and approval workflow."
      table="purchase_orders"
      icon={<span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><ShoppingCart className="h-5 w-5" /></span>}
      onNew={() => toast.info("PO form coming soon")}
      columns={[
        { key: "po_number", label: "PO #" },
        { key: "request_date", label: "Requested" },
        { key: "total_amount", label: "Amount", render: (r: { total_amount: number }) => `$${Number(r.total_amount).toLocaleString()}` },
        { key: "status", label: "Status", render: (r: { status: string }) => <Badge variant="secondary">{r.status}</Badge> },
      ] satisfies Column<{ id: string; total_amount: number; status: string }>[]}
    />
  ),
});
