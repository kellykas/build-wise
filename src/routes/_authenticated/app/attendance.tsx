import { createFileRoute } from "@tanstack/react-router";
import { ModulePage, type Column } from "@/components/app/ModulePage";
import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/app/attendance")({
  component: AttendancePage,
});

function AttendancePage() {
  const { profile, user } = useAuth();
  const qc = useQueryClient();

  const clockIn = async () => {
    if (!profile?.company_id) return;
    const { data: emp } = await supabase.from("employees").select("id").eq("user_id", user!.id).maybeSingle();
    if (!emp) return toast.error("No employee record linked to your user");
    const { error } = await supabase.from("attendance").insert({ company_id: profile.company_id, employee_id: emp.id });
    if (error) return toast.error(error.message);
    toast.success("Clocked in");
    qc.invalidateQueries({ queryKey: ["module", "attendance"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={clockIn}>Clock in</Button></div>
      <ModulePage
        title="Attendance"
        description="Daily clock-ins and work hours."
        table="attendance"
        icon={<span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><ClipboardCheck className="h-5 w-5" /></span>}
        columns={[
          { key: "clock_in", label: "Clock in", render: (r: { clock_in: string }) => new Date(r.clock_in).toLocaleString() },
          { key: "clock_out", label: "Clock out", render: (r: { clock_out: string | null }) => r.clock_out ? new Date(r.clock_out).toLocaleString() : "—" },
          { key: "notes", label: "Notes" },
        ]}
      />
    </div>
  );
}
