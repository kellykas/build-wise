import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, ClipboardList, Wrench, Users, FileText, BarChart3, Boxes, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BuildFlow ERP — Construction Management, Reimagined" },
      { name: "description", content: "Run projects, crews, procurement, inventory and finance from one cloud platform built for construction." },
    ],
  }),
  component: Home,
});

const features = [
  { icon: ClipboardList, title: "Project Management", desc: "Plan, schedule and track every site from kickoff to handover." },
  { icon: Users, title: "HR & Payroll", desc: "Employees, attendance, leave and payroll in one place." },
  { icon: Boxes, title: "Inventory & Procurement", desc: "Stock movements, suppliers and approvals with full audit trail." },
  { icon: Wrench, title: "Equipment & Fleet", desc: "Assign, schedule maintenance and track utilization." },
  { icon: FileText, title: "Invoices & Documents", desc: "Generate invoices and store contracts and site photos securely." },
  { icon: BarChart3, title: "Reports & Analytics", desc: "Live dashboards across operations and finance." },
];

const stats = [
  { v: "500+", l: "Projects delivered" },
  { v: "12k", l: "Crew members" },
  { v: "98%", l: "On-time milestones" },
  { v: "24/7", l: "Cloud uptime" },
];

function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,oklch(0.42_0.07_340/0.12),transparent)]" />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" /> Enterprise-grade · Multi-tenant
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-6xl">
              Construction ERP, <span className="text-primary">simplified</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              BuildFlow brings projects, people, procurement, inventory, equipment and finance into one
              modern platform — so your sites run on time and on budget.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/auth"><Button size="lg">Start free trial <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
              <Link to="/services"><Button size="lg" variant="outline">Explore modules</Button></Link>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.l}>
                  <div className="text-2xl font-bold text-foreground">{s.v}</div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2 text-sm font-semibold"><Building2 className="h-4 w-4 text-primary" /> Project: Riverside Tower</div>
                <span className="rounded-md bg-success/15 px-2 py-0.5 text-xs font-medium text-success">On track</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-lg bg-muted p-3"><div className="text-xs text-muted-foreground">Budget</div><div className="font-semibold">$ 4.2M</div></div>
                <div className="rounded-lg bg-muted p-3"><div className="text-xs text-muted-foreground">Progress</div><div className="font-semibold text-primary">68%</div></div>
                <div className="rounded-lg bg-muted p-3"><div className="text-xs text-muted-foreground">Crew</div><div className="font-semibold">142</div></div>
              </div>
              <div className="mt-4 space-y-2">
                {["Foundation","Structure","MEP","Finishing"].map((p, i) => (
                  <div key={p}>
                    <div className="flex justify-between text-xs text-muted-foreground"><span>{p}</span><span>{[100,92,55,12][i]}%</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${[100,92,55,12][i]}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Every module your construction business needs</h2>
            <p className="mt-3 text-muted-foreground">One login, one source of truth — replace 8 disconnected tools.</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-6 transition hover:border-primary/40 hover:shadow-md">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <div className="mt-4 font-semibold">{f.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl font-bold md:text-4xl">Ready to digitize your sites?</h2>
          <p className="mt-3 text-muted-foreground">Onboard your team in minutes. No credit card required.</p>
          <Link to="/auth"><Button size="lg" className="mt-6">Get started free <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
