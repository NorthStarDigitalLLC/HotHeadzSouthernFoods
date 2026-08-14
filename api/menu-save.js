/**
 * Same-origin proxy for the Hotheadz editor.
 *
 * The protected write logic lives on NorthStar's backend, which already owns
 * the shared NorthStar/BHI Supabase connection. This site therefore cannot
 * drift to a different database because of an old Vercel environment value.
 */
const CENTRAL_MENU_API = process.env.HOTHEADZ_MENU_API_URL || 'https://www.northstardigitalweb.com/api/hotheadz-menu';

const safe = (value, max) => String(value || '').slice(0, max);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  try {
    const response = await fetch(CENTRAL_MENU_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': safe(req.headers['user-agent'], 300),
        'X-Hotheadz-Client-IP': safe(req.headers['x-forwarded-for'], 80).split(',')[0].trim(),
      },
      body: JSON.stringify(body || {}),
    });
    const text = await response.text();
    let payload;
    try { payload = text ? JSON.parse(text) : {}; } catch { payload = { error: safe(text, 300) || 'Unexpected central menu response.' }; }
    return res.status(response.status).json(payload);
  } catch (error) {
    return res.status(502).json({ error: 'The central menu service is temporarily unavailable. Please try again.' });
  }
}
