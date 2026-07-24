import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, FolderKanban, ClipboardList, Users, UserCog, ClipboardCheck,
  Truck, ShoppingCart, Boxes, Wrench, Receipt, Wallet, FileText, CalendarDays,
  Settings, Bell, Search, ChevronDown, LogOut, HardHat, Building2, FileSpreadsheet,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader, SidebarFooter,
  SidebarProvider, SidebarTrigger, SidebarInset,
} from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";

import type { AppRole } from "@/hooks/use-auth";

// roles allowed to see the item. undefined = everyone signed-in.
type NavItemDef = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; roles?: AppRole[] };

const ADMIN: AppRole[] = ["super_admin", "company_owner", "director"];
const HR: AppRole[] = [...ADMIN, "hr_manager"];
const FIN: AppRole[] = [...ADMIN, "accountant"];
const PROC: AppRole[] = [...ADMIN, "procurement_officer", "store_manager"];
const OPS: AppRole[] = [...ADMIN, "project_manager", "site_engineer"];

const groups: { label: string; items: NavItemDef[] }[] = [
  {
    label: "Workspace",
    items: [
      { to: "/app", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
      { to: "/app/notifications", label: "Notifications", icon: Bell },
      { to: "/app/calendar", label: "Agenda", icon: CalendarDays },
    ],
  },
  {
    label: "Opérations",
    items: [
      { to: "/app/projects", label: "Projets", icon: FolderKanban, roles: [...OPS, "accountant"] },
      { to: "/app/tasks", label: "Tâches", icon: ClipboardList },
      { to: "/app/requisitions", label: "États de besoin", icon: FileSpreadsheet, roles: [...OPS, ...FIN, ...PROC] },
      { to: "/app/clients", label: "Clients", icon: Users, roles: [...ADMIN, "project_manager", "accountant"] },
      { to: "/app/client-portal", label: "Portail Client", icon: Building2, roles: [...ADMIN, "project_manager", "client"] },
    ],
  },
  {
    label: "Ressources Humaines",
    items: [
      { to: "/app/employees", label: "Employés", icon: UserCog, roles: HR },
      { to: "/app/attendance", label: "Présence", icon: ClipboardCheck, roles: [...HR, "project_manager"] },
      { to: "/app/payroll", label: "Paie", icon: ClipboardCheck, roles: [...HR, "accountant"] },
    ],
  },
  {
    label: "Chaîne d'approvisionnement",
    items: [
      { to: "/app/suppliers", label: "Fournisseurs", icon: Truck, roles: PROC },
      { to: "/app/procurement", label: "Achats", icon: ShoppingCart, roles: [...PROC, ...FIN] },
      { to: "/app/inventory", label: "Stock", icon: Boxes, roles: [...PROC, "site_engineer"] },
      { to: "/app/equipment", label: "Équipement", icon: Wrench, roles: [...PROC, ...OPS] },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/app/invoices", label: "Factures", icon: Receipt, roles: [...FIN, "project_manager"] },
      { to: "/app/finance", label: "Trésorerie", icon: Wallet, roles: FIN },
    ],
  },
  {
    label: "Bibliothèque",
    items: [
      { to: "/app/documents", label: "Documents", icon: FileText },
      { to: "/app/settings", label: "Paramètres", icon: Settings },
    ],
  },
];


function NavItem({ to, label, icon: Icon, exact }: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active}>
        <Link to={to}>
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, user, signOut, roles, isAdmin } = useAuth();
  const navigate = useNavigate();
  const initials = (profile?.full_name || user?.email || "U").slice(0, 2).toUpperCase();
  const canSee = (allowed?: AppRole[]) =>
    !allowed || isAdmin || allowed.some((r) => roles.includes(r));
  const visibleGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((it) => canSee(it.roles)) }))
    .filter((g) => g.items.length > 0);
  const { data: unreadCount } = useQuery({
    queryKey: ["unread-notifs", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("internal_notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user!.id)
        .is("read_at", null);
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 30_000,
  });


  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <HardHat className="h-4 w-4" />
            </span>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <div className="truncate text-sm font-semibold text-sidebar-foreground">BuildFlow</div>
              <div className="truncate text-xs text-sidebar-foreground/60">Construction ERP</div>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {visibleGroups.map((g) => (
            <SidebarGroup key={g.label}>
              <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {g.items.map((it) => <NavItem key={it.to} {...it} />)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter>
          <div className="px-2 py-2 text-xs text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden">
            v0.1 · {profile?.email}
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger />
          <div className="relative hidden flex-1 max-w-md md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search projects, tasks, clients…" className="pl-9" />
          </div>
          <div className="flex-1 md:hidden" />
          <Button variant="ghost" size="icon" className="relative" onClick={() => navigate({ to: "/app/notifications" })}>
            <Bell className="h-4 w-4" />
            {(unreadCount ?? 0) > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]" variant="destructive">{unreadCount}</Badge>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="h-7 w-7"><AvatarFallback>{initials}</AvatarFallback></Avatar>
                <span className="hidden text-sm sm:inline">{profile?.full_name || user?.email}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{profile?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/app/settings" })}>
                <Settings className="mr-2 h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => { await signOut(); navigate({ to: "/auth" }); }}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="min-h-[calc(100vh-3.5rem)] bg-background p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
