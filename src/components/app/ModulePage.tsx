import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Column<T = any> = { key: string; label: string; render?: (row: T) => ReactNode };

export function ModulePage<T extends { id: string }>({
  title, description, table, columns, onNew, icon,
}: {
  title: string;
  description: string;
  table: string;
  columns: Column<T>[];
  onNew?: () => void;
  icon?: ReactNode;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["module", table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table as never).select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {onNew && (
          <Button onClick={onNew}><Plus className="mr-2 h-4 w-4" /> New</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (data?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 p-16 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground"><Inbox className="h-6 w-6" /></span>
              <div className="text-lg font-semibold">No records yet</div>
              <p className="max-w-sm text-sm text-muted-foreground">
                You haven't created any {title.toLowerCase()} yet. Click "New" to add your first record.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    {columns.map((c) => <th key={String(c.key)} className="px-4 py-3 font-medium">{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data!.map((row) => (
                    <tr key={row.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                      {columns.map((c) => (
                        <td key={String(c.key)} className="px-4 py-3">
                          {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key as string] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
