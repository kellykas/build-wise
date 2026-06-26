import { createFileRoute } from "@tanstack/react-router";
import { ModulePage, type Column } from "@/components/app/ModulePage";
import { FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/documents")({
  component: () => (
    <ModulePage
      title="Documents"
      description="Contracts, reports, photos and project files."
      table="documents"
      icon={<span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><FileText className="h-5 w-5" /></span>}
      onNew={() => toast.info("Upload UI coming soon")}
      columns={[
        { key: "name", label: "File" },
        { key: "folder", label: "Folder" },
        { key: "mime_type", label: "Type" },
        { key: "size_bytes", label: "Size", render: (r: { size_bytes: number }) => `${Math.round(Number(r.size_bytes) / 1024)} KB` },
        { key: "created_at", label: "Uploaded", render: (r: { created_at: string }) => new Date(r.created_at).toLocaleDateString() },
      ] satisfies Column<{ id: string; size_bytes: number; created_at: string }>[]}
    />
  ),
});
