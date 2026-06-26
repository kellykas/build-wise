import { createFileRoute } from "@tanstack/react-router";
import { ModulePage, type Column } from "@/components/app/ModulePage";
import { Truck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/suppliers")({
  component: () => (
    <ModulePage
      title="Suppliers"
      description="Vendor directory and performance."
      table="suppliers"
      icon={<span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><Truck className="h-5 w-5" /></span>}
      onNew={() => toast.info("Supplier form coming soon")}
      columns={[
        { key: "name", label: "Supplier" },
        { key: "contact_person", label: "Contact" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "rating", label: "Rating", render: (r: { rating: number }) => `${Number(r.rating).toFixed(1)} / 5` },
      ]}
    />
  ),
});
