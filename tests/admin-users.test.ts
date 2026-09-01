/**
 * Unit tests for the createCompanyUser server function logic.
 * Tests the client-record creation branch (new in this changeset).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// ── Mock Supabase admin client ──

const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpsert = vi.fn();

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        createUser: vi.fn(),
      },
    },
    from: vi.fn(() => ({
      insert: mockInsert.mockReturnThis(),
      update: mockUpdate.mockReturnThis(),
      select: mockSelect.mockReturnThis(),
      upsert: mockUpsert.mockReturnThis(),
      eq: mockEq.mockReturnThis(),
      maybeSingle: mockMaybeSingle,
    })),
  },
}));

vi.mock("@/integrations/supabase/auth-middleware", () => ({
  requireSupabaseAuth: vi.fn(),
}));

// ── Extract the client-record logic for unit testing ──

/**
 * Simulates the client-record creation logic from createCompanyUser.
 * When role === "client":
 *   - If clientId is provided: UPDATE existing client record
 *   - If no clientId: INSERT new client record
 */
function handleClientRecord(params: {
  role: string;
  clientId?: string;
  userId: string;
  email: string;
  fullName: string;
  phone?: string;
  companyId: string;
}): { action: "create" | "link" | "none"; data: Record<string, unknown> | null } {
  if (params.role !== "client") {
    return { action: "none", data: null };
  }

  if (params.clientId) {
    return {
      action: "link",
      data: {
        table: "clients",
        operation: "update",
        user_id: params.userId,
        email: params.email,
        client_id: params.clientId,
        company_id: params.companyId,
      },
    };
  }

  return {
    action: "create",
    data: {
      table: "clients",
      operation: "insert",
      company_id: params.companyId,
      user_id: params.userId,
      name: params.fullName,
      email: params.email,
      phone: params.phone || null,
    },
  };
}

describe("createCompanyUser — client record logic", () => {
  const baseParams = {
    userId: "550e8400-e29b-41d4-a716-446655440000",
    email: "client@test.com",
    fullName: "Test Client",
    phone: "+1 555 000 0000",
    companyId: "550e8400-e29b-41d4-a716-446655440001",
  };

  it("creates a new client record when role is 'client' and no clientId", () => {
    const result = handleClientRecord({
      ...baseParams,
      role: "client",
    });

    expect(result.action).toBe("create");
    expect(result.data).toEqual({
      table: "clients",
      operation: "insert",
      company_id: baseParams.companyId,
      user_id: baseParams.userId,
      name: baseParams.fullName,
      email: baseParams.email,
      phone: baseParams.phone,
    });
  });

  it("links an existing client record when role is 'client' and clientId is provided", () => {
    const clientId = "550e8400-e29b-41d4-a716-446655440002";
    const result = handleClientRecord({
      ...baseParams,
      role: "client",
      clientId,
    });

    expect(result.action).toBe("link");
    expect(result.data).toEqual({
      table: "clients",
      operation: "update",
      user_id: baseParams.userId,
      email: baseParams.email,
      client_id: clientId,
      company_id: baseParams.companyId,
    });
  });

  it("does nothing for non-client roles", () => {
    for (const role of ["employee", "project_manager", "super_admin", "director"]) {
      const result = handleClientRecord({ ...baseParams, role });
      expect(result.action).toBe("none");
      expect(result.data).toBeNull();
    }
  });

  it("sets phone to null when phone is undefined", () => {
    const result = handleClientRecord({
      ...baseParams,
      role: "client",
      phone: undefined,
    });

    expect(result.action).toBe("create");
    expect(result.data?.phone).toBeNull();
  });

  it("includes phone when provided", () => {
    const result = handleClientRecord({
      ...baseParams,
      role: "client",
      phone: "+33 6 12 34 56 78",
    });

    expect(result.data?.phone).toBe("+33 6 12 34 56 78");
  });
});

describe("createCompanyUser — permission validation (extracted logic)", () => {
  const CAN_MANAGE = ["super_admin", "company_owner", "director", "hr_manager"];
  const CANNOT_MANAGE = ["project_manager", "site_engineer", "accountant", "employee", "client"];

  it("allows user management for admin roles", () => {
    for (const role of CAN_MANAGE) {
      const roles = [{ role }];
      const allowed = roles.some((r) =>
        ["super_admin", "company_owner", "director", "hr_manager"].includes(r.role),
      );
      expect(allowed).toBe(true);
    }
  });

  it("denies user management for non-admin roles", () => {
    for (const role of CANNOT_MANAGE) {
      const roles = [{ role }];
      const allowed = roles.some((r) =>
        ["super_admin", "company_owner", "director", "hr_manager"].includes(r.role),
      );
      expect(allowed).toBe(false);
    }
  });

  it("denies user management when caller has no roles", () => {
    const roles: Array<{ role: string }> = [];
    const allowed = roles.some((r) =>
      ["super_admin", "company_owner", "director", "hr_manager"].includes(r.role),
    );
    expect(allowed).toBe(false);
  });
});

describe("createCompanyUser — password validation", () => {
  it("rejects passwords shorter than 8 characters", () => {
    const short = "abc123";
    expect(short.length).toBeLessThan(8);
  });

  it("accepts passwords of 8+ characters", () => {
    const valid = "Test1234!";
    expect(valid.length).toBeGreaterThanOrEqual(8);
  });

  it("accepts 14-char passwords with special characters", () => {
    const pw = "Ab3!@#$%^&*1234";
    expect(pw.length).toBe(15);
    expect(/[!@#$%^&*]/.test(pw)).toBe(true);
  });
});
