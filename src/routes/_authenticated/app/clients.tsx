import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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

const fields: Field[] = [
  { key: "name", label: "Name", required: true },
  { key: "company", label: "Company" },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone", type: "tel" },
  { key: "address", label: "Address", span: 2 },
  { key: "tax_number", label: "Tax number" },
  { key: "notes", label: "Notes", type: "textarea", span: 2 },
];

function ClientsPage() {
  const { isAdmin, hasRole } = useAuth();
  const canResetPassword = isAdmin || hasRole("project_manager", "director");
  const [editing, setEditing] = useState<Client | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  return (
    <>
      <ModulePage<Client>
      title="Clients"
      description="Your customer database."
      table="clients"
      icon={<span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><Users className="h-5 w-5" /></span>}
      actions={
        <InviteClientDialog>
          <Button size="sm"><UserPlus className="mr-2 h-4 w-4" /> Invite Client</Button>
        </InviteClientDialog>
      }
      onNew={() => { setEditing(null); setNewOpen(true); }}
      onRowClick={(row) => setEditing(row)}
      columns={[
        { key: "name", label: "Name" },
        { key: "company", label: "Company" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        ...(canResetPassword ? [{
          key: "actions",
          label: "Actions",
          render: (row: Client) => row.user_id ? (
            <ResetPasswordDialog userId={row.user_id} userName={row.name}>
              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                <Key className="h-3.5 w-3.5" />
              </Button>
            </ResetPasswordDialog>
          ) : null,
        }] : []),
      ]}
    />
      <EditDialog
        open={newOpen || !!editing}
        onOpenChange={(v) => { if (!v) { setNewOpen(false); setEditing(null); } }}
        table="clients"
        title="client"
        fields={fields}
        row={editing as unknown as Record<string, unknown> | null}
      />
    </>
  );
}
