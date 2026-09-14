import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useSiteContent } from "@/hooks/use-site-content";

export const Route = createFileRoute("/projects")({
  // Fetch site content at the layout level so TanStack Start SSR-prefetches
  // the query and the child routes (index + $projectId) can read it from the
  // shared React Query cache instead of rendering a skeleton on first paint.
  component: function ProjectsLayout() {
    useSiteContent();
    return <Outlet />;
  },
});
