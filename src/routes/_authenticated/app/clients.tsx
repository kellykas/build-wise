import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ModulePage, type Column } from "@/components/app/ModulePage";
import { Users, UserPlus, Key } from "lucide-react";
import { EditDialog, type Field } from "@/components/app/EditDialog";
import { InviteClientDialog } from "@/components/app/InviteClientDialog";
import { ResetPasswordDialog } from "@/components/app/ResetPasswordDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth"

export const Route = createFileRoute("/_authenticated/app/clients")({
  component: ClientsPage,
});

type Client = { id: string; name: string; company: string | null; email: string | null; phone: string | null; address: string | null; tax_number: string | null; notes: string | null; user_id: string | null };

function ClientsPage() {
  const { isAdmin, hasRole } = useAuth();
  const { t } = useTranslation();
  const canResetPassword = isAdmin || hasRole("project_manager", "director");
  const [editing, setEditing] = useState<Client | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const fields: Field[] = [
    { key: "name", label: t("d.clients.name"), required: true },
    { key: "company", label: t("d.clients.company") },
    { key: "email", label: t("d.clients.email"), type: "email" },
    { key: "phone", label: t("d.clients.phone"), type: "tel" },
    { key: "address", label: t("d.clients.address"), span: 2 },
    { key: "tax_number", label: t("d.clients.tax_number") },
    { key: "notes", label: t("d.clients.notes"), type: "textarea", span: 2 },
  ];

  const columns = [
    { key: "name" as const, label: t("d.clients.name") },
    { key: "company" as const, label: t("d.clients.company") },
    { key: "email" as const, label: t("d.clients.email") },
    { key: "phone" as const, label: t("d.clients.phone") },
    ...(canResetPassword ? [{
      key: "actions" as const,
      label: t("d.clients.actions"),
      render: (row: Client) => row.user_id ? (
        <ResetPasswordDialog userId={row.user_id} userName={row.name}>
          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
            <Key className="h-3.5 w-3.5" />
          </Button>
        </ResetPasswordDialog>
      ) : null,
    }] : []),
  ];

  return (
    <>
      <ModulePage<Client>
      title={t("d.clients.title")}
      description={t("d.clients.description")}
      table="clients"
      icon={<span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><Users className="h-5 w-5" /></span>}
      actions={
        <InviteClientDialog>
          <Button size="sm"><UserPlus className="mr-2 h-4 w-4" /> {t("d.clients.invite")}</Button>
        </InviteClientDialog>
      }
      onNew={() => { setEditing(null); setNewOpen(true); }}
      onRowClick={(row) => setEditing(row)}
      columns={columns}
    />
      <EditDialog
        open={newOpen || !!editing}
        onOpenChange={(v) => { if (!v) { setNewOpen(false); setEditing(null); } }}
        table="clients"
        title={t("d.clients.title").toLowerCase()}
        fields={fields}
        row={editing as unknown as Record<string, unknown> | null}
      />
    </>
  );
}