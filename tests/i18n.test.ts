/**
 * Unit tests for i18n translation completeness.
 * Ensures EN and FR translation files have the same keys,
 * and that the access_denied key exists (used in route.tsx).
 */
import { describe, expect, it } from "vitest";
import en from "../src/i18n/en.json";
import fr from "../src/i18n/fr.json";

function getLeafKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      keys.push(...getLeafKeys(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

describe("i18n translation completeness", () => {
  const enKeys = getLeafKeys(en as Record<string, unknown>);
  const frKeys = getLeafKeys(fr as Record<string, unknown>);

  it("EN and FR have the same number of leaf keys", () => {
    expect(frKeys.length).toBe(enKeys.length);
  });

  it("access_denied key exists in both EN and FR", () => {
    expect(en).toHaveProperty("access_denied");
    expect(fr).toHaveProperty("access_denied");
  });

  it("access_denied is a non-empty string in both locales", () => {
    expect(typeof (en as Record<string, unknown>).access_denied).toBe("string");
    expect(((en as Record<string, unknown>).access_denied as string).length).toBeGreaterThan(0);
    expect(typeof (fr as Record<string, unknown>).access_denied).toBe("string");
    expect(((fr as Record<string, unknown>).access_denied as string).length).toBeGreaterThan(0);
  });

  it("FR access_denied differs from EN (actually translated)", () => {
    const enVal = (en as Record<string, string>).access_denied;
    const frVal = (fr as Record<string, string>).access_denied;
    expect(frVal).not.toBe(enVal);
  });

  it("every EN key has a corresponding FR key", () => {
    const missingInFr = enKeys.filter((k) => !frKeys.includes(k));
    expect(missingInFr).toEqual([]);
  });

  it("every FR key has a corresponding EN key", () => {
    const missingInEn = frKeys.filter((k) => !enKeys.includes(k));
    expect(missingInEn).toEqual([]);
  });

  it("language metadata keys are present", () => {
    expect(en).toHaveProperty("language.en");
    expect(en).toHaveProperty("language.fr");
    expect(fr).toHaveProperty("language.en");
    expect(fr).toHaveProperty("language.fr");
  });
});
