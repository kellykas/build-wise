import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import {
  LayoutDashboard, FolderKanban, ClipboardList, Users, UserCog, ClipboardCheck,
  Truck, ShoppingCart, Boxes, Wrench, Receipt, Wallet, FileText, CalendarDays,
  Settings, Bell, Search, ChevronDown, LogOut, HardHat, Building2, FileSpreadsheet,
  ShieldCheck, Menu, X, History, Globe,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { ReactNode } from "react";

import type { AppRole } from "@/hooks/use-auth";
import { ADMIN as _ADMIN, HR as _HR, FIN as _FIN, PROC as _PROC, OPS as _OPS, CLIENT_ALLOWED } from "@/lib/rbac";

type NavItemDef = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; roles?: AppRole[] };

const ADMIN: AppRole[] = _ADMIN;
const HR: AppRole[] = _HR;
const FIN: AppRole[] = _FIN;
const PROC: AppRole[] = _PROC;
const OPS: AppRole[] = _OPS;
void CLIENT_ALLOWED;

// Nav labels use i18n keys — resolved at render time inside AppShell
const NAV_KEYS = {
  groups: {
    workspace: "app.groups.workspace",
    operations: "app.groups.operations",
    hr: "app.groups.hr",
    supply_chain: "app.groups.supply_chain",
    finance: "app.groups.finance",
    library: "app.groups.library",
  },
  nav: {
    dashboard: "app.nav.dashboard",
    notifications: "app.nav.notifications",
    calendar: "app.nav.calendar",
    projects: "app.nav.projects",
    tasks: "app.nav.tasks",
    requisitions: "app.nav.requisitions",
    clients: "app.nav.clients",
    client_portal: "app.nav.client_portal",
    client_space: "app.nav.client_space",
    employees: "app.nav.employees",
    attendance: "app.nav.attendance",
    payroll: "app.nav.payroll",
    suppliers: "app.nav.suppliers",
    procurement: "app.nav.procurement",
    inventory: "app.nav.inventory",
    equipment: "app.nav.equipment",
    invoices: "app.nav.invoices",
    finance: "app.nav.finance",
    documents: "app.nav.documents",
    notification_log: "app.nav.notification_log",
    settings: "app.nav.settings",
  },
  mobile: {
    home: "app.mobile.home",
    tasks: "app.mobile.tasks",
    projects: "app.mobile.projects",
    alerts: "app.mobile.alerts",
  },
} as const;

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

function MobileNav({ visibleGroups, children }: { visibleGroups: { label: string; items: NavItemDef[] }[]; children: ReactNode }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0 md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <img src="/logo-transparent.png" alt="HYCO SARLU" className="h-8 w-8 shrink-0" />
            <div>
              <div className="text-sm font-semibold">{t("app.brand")}</div>
              <div className="text-xs text-muted-foreground">{t("app.subtitle")}</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {visibleGroups.map((g) => (
              <div key={g.label} className="px-3 py-2">
                <div className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{g.label}</div>
                <div className="space-y-0.5">
                  {g.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.to}
                        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() => navigate({ to: item.to })}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            {t("app.version")} · {t("app.brand")} {t("app.subtitle")}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, user, signOut, roles, isAdmin } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isMobile = useIsMobile();
  // Build nav groups with translated labels at render time
  const k = NAV_KEYS;
  const groups: { label: string; items: NavItemDef[] }[] = [
    { label: t(k.groups.workspace), items: [
      { to: "/app", label: t(k.nav.dashboard), icon: LayoutDashboard, exact: true },
      { to: "/app/notifications", label: t(k.nav.notifications), icon: Bell },
      { to: "/app/calendar", label: t(k.nav.calendar), icon: CalendarDays },
    ]},
    { label: t(k.groups.operations), items: [
      { to: "/app/projects", label: t(k.nav.projects), icon: FolderKanban, roles: [...OPS, "accountant"] },
      { to: "/app/tasks", label: t(k.nav.tasks), icon: ClipboardList },
      { to: "/app/requisitions", label: t(k.nav.requisitions), icon: FileSpreadsheet, roles: [...OPS, ...FIN, ...PROC] },
      { to: "/app/clients", label: t(k.nav.clients), icon: Users, roles: [...ADMIN, "project_manager", "accountant"] },
      { to: "/app/client-portal", label: t(k.nav.client_portal), icon: Building2, roles: [...ADMIN, "project_manager", "client"] },
      { to: "/app/client-space", label: t(k.nav.client_space), icon: Receipt, roles: [...ADMIN, "project_manager", "accountant", "client"] },
    ]},
    { label: t(k.groups.hr), items: [
      { to: "/app/employees", label: t(k.nav.employees), icon: UserCog, roles: HR },
      { to: "/app/attendance", label: t(k.nav.attendance), icon: ClipboardCheck, roles: [...HR, "project_manager"] },
      { to: "/app/payroll", label: t(k.nav.payroll), icon: ClipboardCheck, roles: [...HR, "accountant"] },
    ]},
    { label: t(k.groups.supply_chain), items: [
      { to: "/app/suppliers", label: t(k.nav.suppliers), icon: Truck, roles: PROC },
      { to: "/app/procurement", label: t(k.nav.procurement), icon: ShoppingCart, roles: [...PROC, ...FIN] },
      { to: "/app/inventory", label: t(k.nav.inventory), icon: Boxes, roles: [...PROC, "site_engineer"] },
      { to: "/app/equipment", label: t(k.nav.equipment), icon: Wrench, roles: [...PROC, ...OPS] },
    ]},
    { label: t(k.groups.finance), items: [
      { to: "/app/invoices", label: t(k.nav.invoices), icon: Receipt, roles: [...FIN, "project_manager"] },
      { to: "/app/finance", label: t(k.nav.finance), icon: Wallet, roles: FIN },
    ]},
    { label: t(k.groups.library), items: [
      { to: "/app/documents", label: t(k.nav.documents), icon: FileText },
      { to: "/app/notification-log", label: t(k.nav.notification_log), icon: History, roles: [...ADMIN] },
      { to: "/app/cms", label: t("app.nav.cms"), icon: Globe, roles: OPS },
      { to: "/app/site-editor", label: t("app.nav.site_editor"), icon: Globe, roles: OPS },
      { to: "/app/settings", label: t(k.nav.settings), icon: Settings },
    ]},
  ];
  const mobileQuickNav = [
    { to: "/app", label: t(k.mobile.home), icon: LayoutDashboard, exact: true },
    { to: "/app/tasks", label: t(k.mobile.tasks), icon: ClipboardList },
    { to: "/app/projects", label: t(k.mobile.projects), icon: FolderKanban },
    { to: "/app/notifications", label: t(k.mobile.alerts), icon: Bell },
  ];
  const [searchOpen, setSearchOpen] = useState(false);
  const initials = (profile?.full_name || user?.email || "U").slice(0, 2).toUpperCase();
  const isClientOnly = roles.includes("client") && !roles.some((r) => r !== "client");
  const clientAllowedPaths = new Set(["/app/client-portal", "/app/client-space", "/app/notifications", "/app/settings"]);
  const canSee = (item: NavItemDef) => {
    if (isClientOnly) return clientAllowedPaths.has(item.to);
    return !item.roles || isAdmin || item.roles.some((r) => roles.includes(r));
  };
  const visibleGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((it) => canSee(it)) }))
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
            <img src="/logo-transparent.png" alt="HYCO SARLU" className="h-8 w-8 shrink-0 rounded-md bg-white p-1" />
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <div className="truncate text-sm font-semibold text-sidebar-foreground">{t("app.brand")}</div>
              <div className="truncate text-xs text-sidebar-foreground/60">{t("app.subtitle")}</div>
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
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur sm:h-14 sm:gap-3 sm:px-4">
          {/* Mobile: hamburger + sheet nav */}
          <MobileNav visibleGroups={visibleGroups}>
            <SidebarTrigger className="md:hidden" />
          </MobileNav>

          {/* Desktop: sidebar toggle */}
          <SidebarTrigger className="hidden md:flex" />

          {/* Search - desktop */}
          <div className="relative hidden flex-1 max-w-md md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={t("app.search_placeholder")} className="h-9 pl-9 text-sm" />
          </div>

          {/* Search - mobile toggle */}
          <div className="flex-1 md:hidden" />

          {/* Language */}
          <LanguageSwitcher />

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative h-9 w-9 shrink-0" onClick={() => navigate({ to: "/app/notifications" })}>
            <Bell className="h-4 w-4" />
            {(unreadCount ?? 0) > 0 && (
              <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px]" variant="destructive">
                {(unreadCount ?? 0) > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-1.5 px-1.5 sm:gap-2 sm:px-2">
                <Avatar className="h-7 w-7"><AvatarFallback className="text-xs">{initials}</AvatarFallback></Avatar>
                <span className="hidden text-sm sm:inline">{profile?.full_name || user?.email}</span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm">{profile?.full_name || "User"}</span>
                  <span className="text-xs text-muted-foreground">{profile?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/app/settings" })}>
                <Settings className="mr-2 h-4 w-4" /> {t("app.settings")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={async () => { await signOut(); navigate({ to: "/auth" }); }} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> {t("app.sign_out")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Main content */}
        <main className="min-h-[calc(100vh-3rem)] bg-background p-3 pb-20 sm:min-h-[calc(100vh-3.5rem)] sm:p-6 sm:pb-6 lg:p-8">
          {children}
        </main>

        {/* Mobile bottom nav */}
        {isMobile && (
          <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="grid grid-cols-4 gap-1 px-2 py-1.5">
              {mobileQuickNav.map((item) => {
                const Icon = item.icon;
                const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
                return (
                  <button
                    key={item.to}
                    className={`flex flex-col items-center gap-0.5 rounded-md py-1.5 text-[10px] transition-colors ${
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                    }`}
                    onClick={() => navigate({ to: item.to })}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
