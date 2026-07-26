import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/app/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { canAccess } from "@/lib/rbac";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

function AppLayout() {
  const { profile, loading, user, roles, isAdmin } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading || !user) return;
    if (profile && !profile.company_id && pathname !== "/app/onboarding") {
      navigate({ to: "/app/onboarding" });
    }
  }, [profile, loading, user, navigate, pathname]);

  useEffect(() => {
    if (loading || !user || !profile?.company_id) return;
    const isClientOnly = roles.includes("client") && !roles.some((r) => r !== "client");
    if (pathname === "/app/onboarding") return;
    if (!canAccess(pathname, roles, { isAdmin, isClientOnly })) {
      const target = isClientOnly ? "/app/client-portal" : "/app";
      toast.error("Vous n'avez pas accès à cette page.");
      navigate({ to: target, replace: true });
    }
  }, [loading, user, profile?.company_id, roles, isAdmin, pathname, navigate]);

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
