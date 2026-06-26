import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, FolderKanban, ClipboardList, Users, UserCog, ClipboardCheck,
  Truck, ShoppingCart, Boxes, Wrench, Receipt, Wallet, FileText, CalendarDays,
  Settings, Bell, Search, ChevronDown, LogOut, HardHat, Building2
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
import type { ReactNode } from "react";

const groups = [
  {
    label: "Workspace",
    items: [
      { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/app/projects", label: "Projects", icon: FolderKanban },
      { to: "/app/tasks", label: "Tasks", icon: ClipboardList },
      { to: "/app/clients", label: "Clients", icon: Users },
      { to: "/app/client-portal", label: "Client Portal", icon: Building2 },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/app/employees", label: "Employees", icon: UserCog },
      { to: "/app/attendance", label: "Attendance", icon: ClipboardCheck },
    ],
  },
  {
    label: "Supply Chain",
    items: [
      { to: "/app/suppliers", label: "Suppliers", icon: Truck },
      { to: "/app/procurement", label: "Procurement", icon: ShoppingCart },
      { to: "/app/inventory", label: "Inventory", icon: Boxes },
      { to: "/app/equipment", label: "Equipment", icon: Wrench },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/app/invoices", label: "Invoices", icon: Receipt },
      { to: "/app/finance", label: "Finance", icon: Wallet },
    ],
  },
  {
    label: "Library",
    items: [
      { to: "/app/documents", label: "Documents", icon: FileText },
      { to: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
] as const;

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
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const initials = (profile?.full_name || user?.email || "U").slice(0, 2).toUpperCase();

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
          {groups.map((g) => (
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
          <Button variant="ghost" size="icon"><Bell className="h-4 w-4" /></Button>
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
