import { createFileRoute } from "@tanstack/react-router";
import { ModulePage, type Column } from "@/components/app/ModulePage";
import { Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const tone: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-warning/15 text-warning",
  paid: "bg-success/15 text-success",
  overdue: "bg-destructive/15 text-destructive",
};

export const Route = createFileRoute("/_authenticated/app/invoices")({
  component: () => (
    <ModulePage
      title="Invoices"
      description="Billing across all clients and projects."
      table="invoices"
      icon={<span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><Receipt className="h-5 w-5" /></span>}
      onNew={() => toast.info("Invoice form coming soon")}
      columns={[
        { key: "invoice_number", label: "Invoice #" },
        { key: "issue_date", label: "Issued" },
        { key: "due_date", label: "Due" },
        { key: "amount", label: "Amount", render: (r: { amount: number }) => `$${Number(r.amount).toLocaleString()}` },
        { key: "status", label: "Status", render: (r: { status: string }) => <Badge className={tone[r.status] ?? ""}>{r.status}</Badge> },
      ]}
    />
  ),
});
