import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/app/AppShell";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

function AppLayout() {
  const { profile, loading, user, roles } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Send users without a company to onboarding (except when already there).
  useEffect(() => {
    if (loading || !user) return;
    if (profile && !profile.company_id && location.pathname !== "/app/onboarding") {
      navigate({ to: "/app/onboarding" });
    }
  }, [profile, loading, user, navigate]);

  useEffect(() => {
    if (loading || !user || !profile?.company_id) return;
    const isClientOnly = roles.includes("client") && !roles.some((role) => role !== "client");
    const allowed = pathname === "/app/client-portal" || pathname === "/app/notifications" || pathname === "/app/settings";
    if (isClientOnly && !allowed) navigate({ to: "/app/client-portal", replace: true });
  }, [loading, user, profile?.company_id, roles, pathname, navigate]);

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
