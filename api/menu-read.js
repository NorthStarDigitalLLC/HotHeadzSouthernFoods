/**
 * Same-origin read proxy for Hot Headz menu data.
 *
 * These pages used to query Supabase straight from the browser with an anon
 * key written into the shipped JavaScript. This site is static — there is no
 * build step — so that key could never come from an environment variable, and
 * when it was rotated every read on the site started failing with 401.
 *
 * Reads now go through NorthStar's backend, which already holds the shared
 * Supabase connection. No database key reaches a browser, and there is no
 * second copy of the credentials to keep in sync.
 */
const CENTRAL_MENU_API = process.env.HOTHEADZ_MENU_API_URL || 'https://www.northstardigitalweb.com/api/hotheadz-menu';

const TABLES = new Set(['menu_defaults', 'lunch_dates', 'drawing_projects']);
const safe = (value, max) => String(value ?? '').slice(0, max);

function readBody(req) {
  if (req.method === 'GET') return req.query || {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body || {};
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(405).json({ error: 'GET or POST only' });
  }

  const source = readBody(req);
  const table = safe(source.table, 40);
  if (!TABLES.has(table)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ error: 'Invalid menu table.' });
  }

  const match = source.match === undefined || source.match === null || source.match === '' ? null : safe(source.match, 64);
  const from = source.from === undefined || source.from === null || source.from === '' ? null : safe(source.from, 32);
  const direction = source.direction === 'asc' ? 'asc' : undefined;
  const limit = Number.parseInt(source.limit, 10);

  try {
    const response = await fetch(CENTRAL_MENU_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': safe(req.headers['user-agent'], 300),
        'X-Hotheadz-Client-IP': safe(req.headers['x-forwarded-for'], 80).split(',')[0].trim(),
      },
      body: JSON.stringify({ op: 'select', table, match, from, direction, limit: Number.isFinite(limit) ? limit : undefined }),
    });
    const text = await response.text();
    let payload;
    try { payload = text ? JSON.parse(text) : {}; }
    catch { payload = { error: safe(text, 300) || 'Unexpected central menu response.' }; }

    if (!response.ok) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(response.status).json(payload);
    }
    // The storefront wants a cache; whoever just pressed Publish does not.
    // stale-while-revalidate=300 meant the person who published could be shown
    // the old menu for five minutes and reasonably conclude the save had
    // failed — which is exactly what happened. `fresh:true` opts out, and the
    // revalidate window is short enough that an ordinary visitor is never far
    // behind either.
    if (source.fresh) {
      res.setHeader('Cache-Control', 'no-store');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=45');
    }
    return res.status(200).json(payload);
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'The menu service is temporarily unavailable. Please try again.' });
  }
}
