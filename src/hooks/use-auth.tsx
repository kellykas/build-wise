import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  company_id: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
};

export type AppRole =
  | "super_admin" | "company_owner" | "director" | "project_manager"
  | "site_engineer" | "accountant" | "hr_manager" | "procurement_officer"
  | "store_manager" | "employee" | "client";

export type PermissionKey = string;

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  permissions: Set<PermissionKey>;
  hasRole: (...r: AppRole[]) => boolean;
  hasPermission: (permission: PermissionKey) => boolean;
  isAdmin: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<Set<PermissionKey>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("id, company_id, full_name, email, avatar_url, phone").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile(p as Profile | null);
    setRoles(((r ?? []) as { role: AppRole }[]).map((x) => x.role));
    
    // Load permissions via RPC (will work once migration is run)
    try {
      const { data: perms } = await supabase.rpc("get_user_permissions" as never, { _user_id: uid } as never);
      const permSet = new Set<PermissionKey>();
      if (Array.isArray(perms)) {
        (perms as Array<{ permission_key: string; granted: boolean }>).forEach((perm) => {
          if (perm.granted) permSet.add(perm.permission_key);
        });
      }
      setPermissions(permSet);
    } catch {
      // Migration not run yet - permissions will be empty
      setPermissions(new Set());
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) setTimeout(() => loadProfile(s.user.id), 0);
      else {      setProfile(null); setRoles([]); setPermissions(new Set()); }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = async () => { if (session?.user) await loadProfile(session.user.id); };
  const signOut = async () => { await supabase.auth.signOut(); };
  const hasRole = (...r: AppRole[]) => r.some((x) => roles.includes(x));
  const hasPermission = (permission: PermissionKey) => permissions.has(permission);
  const isAdmin = hasRole("super_admin", "company_owner");

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, profile, roles, permissions, hasRole, hasPermission, isAdmin, loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
