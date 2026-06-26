import { createFileRoute } from "@tanstack/react-router";
import { ModulePage, type Column } from "@/components/app/ModulePage";
import { Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/clients")({
  component: () => (
    <ModulePage
      title="Clients"
      description="Your customer database."
      table="clients"
      icon={<span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><Users className="h-5 w-5" /></span>}
      onNew={() => toast.info("Client create form coming soon")}
      columns={[
        { key: "name", label: "Name" },
        { key: "company", label: "Company" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
      ]}
    />
  ),
});
