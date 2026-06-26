import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/client-portal")({
  component: () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Client Portal</h1>
          <p className="text-sm text-muted-foreground">What your clients see when they log in.</p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {["Project progress", "Invoices", "Messages"].map((t) => (
          <Card key={t}>
            <CardHeader><CardTitle className="text-base">{t}</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Clients with the <span className="font-medium text-foreground">client</span> role see their own projects only.
              Hook up invites and per-client RLS to flip this on for production.
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  ),
});
