import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes an email address for account creation and lookups:
 * trims whitespace, lowercases, and strips diacritics (NFD + remove combining
 * marks), e.g. "Ingénieur…" → "ingenieur…". GoTrue and most providers
 * (Gmail, Outlook…) only accept ASCII local parts, so a French-accented
 * address like ingénieurmichelbalimbasa@gmail.com must be stored as
 * ingenieurmichelbalimbasa@gmail.com.
 */
export function normalizeEmail(email: string): string {
  return email
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
