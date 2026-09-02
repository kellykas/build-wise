import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ModulePage, type Column } from "@/components/app/ModulePage";
import { UserCog } from "lucide-react";
import { EditDialog, type Field } from "@/components/app/EditDialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/employees")({
  component: EmployeesPage,
});

type Employee = { id: string; employee_number: string; full_name: string; email: string; phone: string; position: string; department: string; salary: number; status: string; hourly_rate: number };

function EmployeesPage() {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<Employee | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const fields: Field[] = [
    { key: "employee_number", label: t("d.employees.employee_number"), required: true },
    { key: "full_name", label: t("d.employees.full_name"), required: true },
    { key: "email", label: t("d.employees.email"), type: "email" },
    { key: "phone", label: t("d.employees.phone"), type: "tel" },
    { key: "position", label: t("d.employees.position") },
    { key: "department", label: t("d.employees.department") },
    { key: "salary", label: t("d.employees.monthly_salary"), type: "number", step: "0.01" },
    { key: "hourly_rate", label: t("d.employees.hourly_rate"), type: "number", step: "0.01" },
    { key: "employment_date", label: t("d.employees.hire_date"), type: "date" },
    { key: "bank_account", label: t("d.employees.bank_account") },
    { key: "status", label: t("d.employees.status"), type: "select", options: [
      { value: "active", label: t("d.employees.active") }, { value: "on_leave", label: t("d.employees.on_leave") }, { value: "inactive", label: t("d.employees.inactive") },
    ] },
  ];

  const columns: Column<Employee>[] = [
    { key: "employee_number", label: "ID" },
    { key: "full_name", label: t("d.employees.full_name"), render: (r) => <span className="font-medium">{r.full_name}</span> },
    { key: "position", label: t("d.employees.position") },
    { key: "department", label: t("d.employees.department") },
    { key: "salary", label: t("d.employees.salary"), render: (r) => `$${Number(r.salary || 0).toLocaleString()}` },
    { key: "status", label: t("d.employees.status"), render: (r) => <Badge variant="secondary">{r.status ?? t("d.employees.active")}</Badge> },
  ];

  return (
    <>
      <ModulePage<Employee>
        title={t("d.employees.title")}
        description={t("d.employees.description")}
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
        title={t("d.employees.title").toLowerCase()}
        fields={fields}
        row={editing as unknown as Record<string, unknown> | null}
      />
    </>
  );
}