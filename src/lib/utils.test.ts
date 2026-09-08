import { describe, expect, it } from "vitest";
import { normalizeEmail } from "@/lib/utils";

describe("normalizeEmail", () => {
  it("strips French accents from the local part", () => {
    expect(normalizeEmail("ingénieurmichelbalimbasa@gmail.com")).toBe(
      "ingenieurmichelbalimbasa@gmail.com",
    );
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeEmail("  User@Example.com  ")).toBe("user@example.com");
  });

  it("lowercases the address", () => {
    expect(normalizeEmail("KellyKas@Gmail.COM")).toBe("kellykas@gmail.com");
  });

  it("leaves already-ASCII addresses untouched apart from case/trim", () => {
    expect(normalizeEmail("mardochewiz@gmail.com")).toBe("mardochewiz@gmail.com");
  });

  it("handles multiple accented characters", () => {
    expect(normalizeEmail("élève.ingénieur@exemple.fr")).toBe("eleve.ingenieur@exemple.fr");
  });

  it("returns an empty string for empty input", () => {
    expect(normalizeEmail("   ")).toBe("");
  });
});