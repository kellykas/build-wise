import { createFileRoute } from "@tanstack/react-router";
import { ModulePage, type Column } from "@/components/app/ModulePage";
import { UserCog } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/employees")({
  component: () => (
    <ModulePage
      title="Employees"
      description="Manage your team, roles and payroll details."
      table="employees"
      icon={<span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><UserCog className="h-5 w-5" /></span>}
      onNew={() => toast.info("Employee form coming soon")}
      columns={[
        { key: "employee_number", label: "ID" },
        { key: "full_name", label: "Name" },
        { key: "position", label: "Position" },
        { key: "department", label: "Department" },
        { key: "salary", label: "Salary", render: (r: { salary: number }) => `$${Number(r.salary).toLocaleString()}` },
      ] satisfies Column<{ id: string; salary: number }>[]}
    />
  ),
});
