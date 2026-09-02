import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { I18nProvider } from "@/components/providers/I18nProvider";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">{t("not_found.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("not_found.subtitle")}
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {t("not_found.go_home")}
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isReady = i18n.isInitialized && i18n.hasResourceBundle(i18n.language, "translation");
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">{isReady ? t("error.title") : "Something went wrong"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {isReady ? t("error.try_again") : "Try again"}
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Scer-L/Construct Sarl — Construction Management Platform" },
      { name: "description", content: "Engagés pour construire vos rêves. Cloud construction ERP for project, HR, procurement, inventory, equipment, finance and document management." },
      { property: "og:title", content: "Scer-L/Construct Sarl — Construction Management Platform" },
      { property: "og:description", content: "Engagés pour construire vos rêves. Cloud construction ERP for project, HR, procurement, inventory, equipment, finance and document management." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Scer-L/Construct Sarl — Construction Management Platform" },
      { name: "twitter:description", content: "Engagés pour construire vos rêves. Cloud construction ERP for project, HR, procurement, inventory, equipment, finance and document management." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e31affb1-800b-4336-a08b-df47ddb0f0e9/id-preview-5c1fda6a--5c3aaadc-f385-4c37-9c41-07ea1aa9dc9e.lovable.app-1782674874349.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e31affb1-800b-4336-a08b-df47ddb0f0e9/id-preview-5c1fda6a--5c3aaadc-f385-4c37-9c41-07ea1aa9dc9e.lovable.app-1782674874349.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <Outlet />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
