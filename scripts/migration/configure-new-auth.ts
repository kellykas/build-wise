// Configure auth on the NEW project: site URL + redirect URLs for production.
// SECURITY: reads token from /tmp/sb_token, never prints it.
import { readFileSync } from "node:fs";

const NEW_REF = "hslpfgwmbvxkliszpbtx";
const token = readFileSync("/tmp/sb_token", "utf8").trim();

const res = await fetch(`https://api.supabase.com/v1/projects/${NEW_REF}/config/auth`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    site_url: "https://scerlconstruct.org",
    redirect_urls: [
      "https://scerlconstruct.org/**",
      "https://www.scerlconstruct.org/**",
      "http://localhost:5173/**",
      "http://localhost:3000/**",
    ],
  }),
});
console.log("Auth config update:", res.status);
if (!res.ok) console.log((await res.text()).slice(0, 300));

const check = await fetch(`https://api.supabase.com/v1/projects/${NEW_REF}/config/auth`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (check.ok) {
  const cfg = await check.json();
  console.log("Site URL now:", cfg.site_url);
  console.log("Redirect URLs:", JSON.stringify(cfg.redirect_urls));
}
