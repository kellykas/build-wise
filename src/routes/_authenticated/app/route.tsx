import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/app/AppShell";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

function AppLayout() {
  const { profile, loading, user } = useAuth();
  const navigate = useNavigate();

  // Send users without a company to onboarding (except when already there).
  useEffect(() => {
    if (loading || !user) return;
    if (profile && !profile.company_id && location.pathname !== "/app/onboarding") {
      navigate({ to: "/app/onboarding" });
    }
  }, [profile, loading, user, navigate]);

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
