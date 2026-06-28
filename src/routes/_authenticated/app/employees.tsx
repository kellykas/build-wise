import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ModulePage, type Column } from "@/components/app/ModulePage";
import { UserCog } from "lucide-react";
import { EditDialog, type Field } from "@/components/app/EditDialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/employees")({
  component: EmployeesPage,
});

type Employee = { id: string; employee_number: string; full_name: string; email: string; phone: string; position: string; department: string; salary: number; status: string; hourly_rate: number };

const fields: Field[] = [
  { key: "employee_number", label: "Employee #", required: true },
  { key: "full_name", label: "Full name", required: true },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone", type: "tel" },
  { key: "position", label: "Position" },
  { key: "department", label: "Department" },
  { key: "salary", label: "Monthly salary", type: "number", step: "0.01" },
  { key: "hourly_rate", label: "Hourly rate", type: "number", step: "0.01" },
  { key: "employment_date", label: "Hire date", type: "date" },
  { key: "bank_account", label: "Bank account" },
  { key: "status", label: "Status", type: "select", options: [
    { value: "active", label: "Active" }, { value: "on_leave", label: "On leave" }, { value: "inactive", label: "Inactive" },
  ] },
];

function EmployeesPage() {
  const [editing, setEditing] = useState<Employee | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const columns: Column<Employee>[] = [
    { key: "employee_number", label: "ID" },
    { key: "full_name", label: "Name", render: (r) => <span className="font-medium">{r.full_name}</span> },
    { key: "position", label: "Position" },
    { key: "department", label: "Department" },
    { key: "salary", label: "Salary", render: (r) => `$${Number(r.salary || 0).toLocaleString()}` },
    { key: "status", label: "Status", render: (r) => <Badge variant="secondary">{r.status ?? "active"}</Badge> },
  ];
  return (
    <>
      <ModulePage<Employee>
        title="Employees"
        description="Click any row to edit, change role, or remove."
        table="employees"
        columns={columns}
        icon={<span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><UserCog className="h-5 w-5" /></span>}
        onNew={() => { setEditing(null); setNewOpen(true); }}
        onRowClick={(r) => setEditing(r)}
      />
      <EditDialog
        open={newOpen || !!editing}
        onOpenChange={(v) => { if (!v) { setNewOpen(false); setEditing(null); } }}
        table="employees"
        title="employee"
        fields={fields}
        row={editing as unknown as Record<string, unknown> | null}
      />
    </>
  );
}
