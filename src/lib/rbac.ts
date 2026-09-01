import type { AppRole } from "@/hooks/use-auth";

export const ADMIN: AppRole[] = ["super_admin", "company_owner", "director"];
export const HR: AppRole[] = [...ADMIN, "hr_manager"];
export const FIN: AppRole[] = [...ADMIN, "accountant"];
export const PROC: AppRole[] = [...ADMIN, "procurement_officer", "store_manager"];
export const OPS: AppRole[] = [...ADMIN, "project_manager", "site_engineer"];

// Route-level permission map. undefined => everyone signed-in.
// Matches sidebar; enforced by _authenticated/app/route.tsx redirect.
export const ROUTE_ROLES: Record<string, AppRole[] | undefined> = {
  "/app": undefined,
  "/app/notifications": undefined,
  "/app/calendar": undefined,
  "/app/onboarding": undefined,
  "/app/settings": undefined,
  "/app/documents": undefined,


  "/app/projects": [...OPS, "accountant"],
  "/app/tasks": undefined,
  "/app/requisitions": [...OPS, ...FIN, ...PROC],
  "/app/clients": [...ADMIN, "project_manager", "accountant"],
  "/app/client-portal": [...ADMIN, "project_manager", "client"],

  "/app/employees": HR,
  "/app/attendance": [...HR, "project_manager"],
  "/app/payroll": [...HR, "accountant"],

  "/app/suppliers": PROC,
  "/app/procurement": [...PROC, ...FIN],
  "/app/inventory": [...PROC, "site_engineer"],
  "/app/equipment": [...PROC, ...OPS],

  "/app/invoices": [...FIN, "project_manager"],
  "/app/finance": FIN,
};

export const CLIENT_ALLOWED = new Set<string>([
  "/app/client-portal",
  "/app/notifications",
  "/app/settings",
]);

// Returns the roles required for the closest matching route prefix.
export function requiredRoles(pathname: string): AppRole[] | undefined | "unknown" {
  // exact match first
  if (pathname in ROUTE_ROLES) return ROUTE_ROLES[pathname];
  // prefix match on the longest key
  let best: string | null = null;
  for (const key of Object.keys(ROUTE_ROLES)) {
    if (pathname === key || pathname.startsWith(key + "/")) {
      if (!best || key.length > best.length) best = key;
    }
  }
  if (best) return ROUTE_ROLES[best];
  return "unknown";
}

export function canAccess(
  pathname: string,
  roles: AppRole[],
  opts: { isAdmin: boolean; isClientOnly: boolean },
): boolean {
  if (opts.isClientOnly) {
    for (const key of CLIENT_ALLOWED) {
      if (pathname === key || pathname.startsWith(key + "/")) return true;
    }
    return false;
  }
  const req = requiredRoles(pathname);
  if (req === "unknown") return true; // unknown routes: don't block
  if (!req) return true;
  if (opts.isAdmin) return true;
  return req.some((r) => roles.includes(r));
}
