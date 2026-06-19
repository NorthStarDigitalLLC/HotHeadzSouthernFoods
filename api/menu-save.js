// ═══════════════════════════════════════════════════════════════════════════
// /api/menu-save.js — secure write proxy for the Hot Headz menu editor.
//
// The editor (editor.html) is public, so it CANNOT hold a write key. It sends
// the staff PIN here; this function verifies the PIN server-side and performs
// the write into the central NorthStar database using the service-role key
// (which never leaves the server). The public can read the menu, but only
// someone with the PIN can change it.
//
// REQUIRED ENV (set in the Hot Headz Vercel project):
//   CENTRAL_SERVICE_ROLE_KEY = <service_role key for the central NSD Supabase>
// OPTIONAL ENV:
//   CENTRAL_SUPABASE_URL     = https://lljvxmqpnkdtnwvuaqkd.supabase.co (default)
//   MENU_CLIENT_ID           = fb272a86-5b9e-4199-9818-fa68efc5ccd6 (default)
//   MENU_EDITOR_PIN_SHA256   = sha256 of the editor PIN (default matches the
//                              PIN baked into editor.html). Set this to a hash
//                              of a longer, private PIN for stronger security —
//                              and update PIN_HASH in editor.html to match.
// ═══════════════════════════════════════════════════════════════════════════
import crypto from "node:crypto";

const CENTRAL_URL = (process.env.CENTRAL_SUPABASE_URL || "https://lljvxmqpnkdtnwvuaqkd.supabase.co").replace(/\/+$/, "");
const SERVICE_KEY = process.env.CENTRAL_SERVICE_ROLE_KEY;
const CLIENT_ID = process.env.MENU_CLIENT_ID || "fb272a86-5b9e-4199-9818-fa68efc5ccd6";
const PIN_SHA256 = process.env.MENU_EDITOR_PIN_SHA256 || "77334823791bea53e508ba59387c1287c8da962026769657b4686756db4b7bc8";

// logical table → central (client-scoped) table + conflict key + writable columns
const TABLES = {
  menu_defaults:    { table: "site_menu_defaults",    pk: "client_id,key",        cols: ["key", "value"],                            match: "key" },
  lunch_dates:      { table: "site_lunch_dates",      pk: "client_id,lunch_date", cols: ["lunch_date", "data", "saved_by"],          match: "lunch_date" },
  drawing_projects: { table: "site_drawing_projects", pk: "client_id,id",         cols: ["id", "name", "data", "saved_by", "updated_at"], match: "id" },
};

// best-effort brute-force throttle (per warm instance)
const hits = new Map();
function rateOk(ip) {
  const now = Date.now(), windowMs = 60000, max = 40;
  const arr = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(ip, arr); return false; }
  arr.push(now); hits.set(ip, arr); return true;
}

const sha256 = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
const timingSafeEq = (a, b) => {
  const ab = Buffer.from(a), bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!SERVICE_KEY) return res.status(500).json({ error: "Server not configured (CENTRAL_SERVICE_ROLE_KEY missing)." });

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (!rateOk(ip)) return res.status(429).json({ error: "Too many requests — slow down." });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};
  const { pin, op, table } = body;

  if (!pin || !timingSafeEq(sha256(pin), PIN_SHA256)) return res.status(403).json({ error: "Wrong PIN." });

  const H = { apikey: SERVICE_KEY, Authorization: "Bearer " + SERVICE_KEY, "Content-Type": "application/json" };

  try {
    // Image upload → central media bucket, returns a public URL.
    if (op === "upload") {
      const { path, dataUrl, contentType } = body;
      if (!path || !dataUrl) return res.status(400).json({ error: "missing path/dataUrl" });
      const m = String(dataUrl).match(/^data:([^;]+);base64,(.*)$/);
      const ct = (m && m[1]) || contentType || "image/jpeg";
      const buf = Buffer.from(m ? m[2] : dataUrl, "base64");
      const enc = String(path).split("/").map(encodeURIComponent).join("/");
      const r = await fetch(CENTRAL_URL + "/storage/v1/object/media/" + enc, {
        method: "POST",
        headers: { apikey: SERVICE_KEY, Authorization: "Bearer " + SERVICE_KEY, "x-upsert": "true", "Content-Type": ct, "cache-control": "3600" },
        body: buf,
      });
      if (!r.ok) return res.status(502).json({ error: "upload failed: " + (await r.text()).slice(0, 200) });
      return res.status(200).json({ url: CENTRAL_URL + "/storage/v1/object/public/media/" + enc });
    }

    const cfg = TABLES[table];
    if (!cfg) return res.status(400).json({ error: "bad table" });

    if (op === "upsert") {
      const row = body.row || {};
      const clean = { client_id: CLIENT_ID };
      cfg.cols.forEach((c) => { if (row[c] !== undefined) clean[c] = row[c]; });
      const r = await fetch(CENTRAL_URL + "/rest/v1/" + cfg.table + "?on_conflict=" + encodeURIComponent(cfg.pk), {
        method: "POST",
        headers: Object.assign({}, H, { Prefer: "resolution=merge-duplicates,return=minimal" }),
        body: JSON.stringify(clean),
      });
      if (!r.ok) return res.status(502).json({ error: (await r.text()).slice(0, 200) });
      return res.status(200).json({ ok: true });
    }

    if (op === "delete") {
      const match = body.match || {};
      const col = cfg.match;
      if (match[col] === undefined) return res.status(400).json({ error: "missing match." + col });
      const url = CENTRAL_URL + "/rest/v1/" + cfg.table +
        "?client_id=eq." + encodeURIComponent(CLIENT_ID) +
        "&" + col + "=eq." + encodeURIComponent(match[col]);
      const r = await fetch(url, { method: "DELETE", headers: H });
      if (!r.ok) return res.status(502).json({ error: (await r.text()).slice(0, 200) });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "bad op" });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
