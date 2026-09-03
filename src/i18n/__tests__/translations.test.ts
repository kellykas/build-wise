import { describe, it, expect } from "vitest";
import fr from "../fr.json";
import en from "../en.json";

describe("i18n translation files", () => {
  it("fr.json and en.json have matching top-level keys", () => {
    const frKeys = Object.keys(fr).sort();
    const enKeys = Object.keys(en).sort();
    expect(frKeys).toEqual(enKeys);
  });

  it("d namespace exists in both files", () => {
    expect(fr).toHaveProperty("d");
    expect(en).toHaveProperty("d");
  });

  it("d.settings section exists in both languages", () => {
    expect(fr.d).toHaveProperty("settings");
    expect(en.d).toHaveProperty("settings");
    expect(typeof fr.d.settings).toBe("object");
    expect(typeof en.d.settings).toBe("object");
  });

  it("d.portal section exists in both languages", () => {
    expect(fr.d).toHaveProperty("portal");
    expect(en.d).toHaveProperty("portal");
    expect(typeof fr.d.portal).toBe("object");
    expect(typeof en.d.portal).toBe("object");
  });

  it("d.projects section exists in both languages", () => {
    expect(fr.d).toHaveProperty("projects");
    expect(en.d).toHaveProperty("projects");
    expect(typeof fr.d.projects).toBe("object");
    expect(typeof en.d.projects).toBe("object");
  });

  it("d.settings has matching keys between fr and en", () => {
    const frKeys = Object.keys(fr.d.settings).sort();
    const enKeys = Object.keys(en.d.settings).sort();
    expect(frKeys).toEqual(enKeys);
  });

  it("d.portal has matching keys between fr and en", () => {
    const frKeys = Object.keys(fr.d.portal).sort();
    const enKeys = Object.keys(en.d.portal).sort();
    expect(frKeys).toEqual(enKeys);
  });

  it("d.projects has matching keys between fr and en", () => {
    const frKeys = Object.keys(fr.d.projects).sort();
    const enKeys = Object.keys(en.d.projects).sort();
    expect(frKeys).toEqual(enKeys);
  });

  it("no translation value is an empty string", () => {
    const findEmpty = (obj: Record<string, unknown>, path = ""): string[] => {
      const empty: string[] = [];
      for (const [key, val] of Object.entries(obj)) {
        if (typeof val === "string" && val.trim() === "") {
          empty.push(`${path}.${key}`);
        } else if (typeof val === "object" && val !== null) {
          empty.push(...findEmpty(val as Record<string, unknown>, `${path}.${key}`));
        }
      }
      return empty;
    };
    const emptyFr = findEmpty(fr.d as Record<string, unknown>, "fr.d");
    const emptyEn = findEmpty(en.d as Record<string, unknown>, "en.d");
    expect(emptyFr).toEqual([]);
    expect(emptyEn).toEqual([]);
  });

  it("no translation contains long dashes (—) between words", () => {
    const findDashes = (obj: Record<string, unknown>, path = ""): string[] => {
      const found: string[] = [];
      for (const [key, val] of Object.entries(obj)) {
        if (typeof val === "string" && val.includes("—")) {
          found.push(`${path}.${key}: "${val}"`);
        } else if (typeof val === "object" && val !== null) {
          found.push(...findDashes(val as Record<string, unknown>, `${path}.${key}`));
        }
      }
      return found;
    };
    const dashesFr = findDashes(fr.d as Record<string, unknown>, "fr.d");
    expect(dashesFr).toEqual([]);
  });

  it("d.common section has matching keys between fr and en", () => {
    const frKeys = Object.keys(fr.d.common).sort();
    const enKeys = Object.keys(en.d.common).sort();
    expect(frKeys).toEqual(enKeys);
  });
});
