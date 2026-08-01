import { describe, expect, it } from "vitest";
import {
  buildProgressPhotoPath,
  buildStoragePath,
  diagnoseUploadError,
  safeFileName,
  sortGallery,
} from "./upload";

describe("safeFileName", () => {
  it("strips characters that break storage keys", () => {
    expect(safeFileName("Plan étage #2 (final).pdf")).toBe("Plan_tage__2__final_.pdf");
  });
});

describe("storage paths", () => {
  it("scopes documents under the company id, as the storage policy requires", () => {
    const p = buildStoragePath({ companyId: "c1", projectId: "p1", folder: "Plans", fileName: "a b.pdf", now: 10 });
    expect(p).toBe("c1/p1/Plans/10-a_b.pdf");
    expect(p.split("/")[0]).toBe("c1");
  });

  it("falls back to the general segment when no project is selected", () => {
    expect(buildStoragePath({ companyId: "c1", projectId: null, folder: "Contrats", fileName: "x.pdf", now: 1 }))
      .toBe("c1/general/Contrats/1-x.pdf");
  });

  it("builds portal photo paths matching company/project/progress", () => {
    const p = buildProgressPhotoPath({ companyId: "c1", projectId: "p1", fileName: "img.jpg", now: 5 });
    expect(p.split("/").slice(0, 3)).toEqual(["c1", "p1", "progress"]);
  });
});

describe("diagnoseUploadError", () => {
  it("explains RLS violations with an actionable hint", () => {
    const d = diagnoseUploadError({ message: 'new row violates row-level security policy for table "documents"' }, "database");
    expect(d.permission).toBe(true);
    expect(d.hint).toMatch(/projet|administrateur/i);
  });

  it("flags storage 403s as permission problems", () => {
    const d = diagnoseUploadError({ message: "Unauthorized", statusCode: "403" }, "storage");
    expect(d.permission).toBe(true);
  });

  it("passes through unknown errors with generic guidance", () => {
    const d = diagnoseUploadError({ message: "boom" }, "storage");
    expect(d.permission).toBe(false);
    expect(d.message).toBe("boom");
    expect(d.hint).toContain("Upload checks");
  });
});

describe("sortGallery", () => {
  const items = [
    { name: "b", created_at: "2026-01-02T00:00:00Z" },
    { name: "a", created_at: "2026-01-03T00:00:00Z" },
    { name: "c", created_at: "2026-01-01T00:00:00Z" },
  ];
  it("sorts newest first", () => expect(sortGallery(items, "newest").map((i) => i.name)).toEqual(["a", "b", "c"]));
  it("sorts oldest first", () => expect(sortGallery(items, "oldest").map((i) => i.name)).toEqual(["c", "b", "a"]));
  it("sorts by name", () => expect(sortGallery(items, "name").map((i) => i.name)).toEqual(["a", "b", "c"]));
});
