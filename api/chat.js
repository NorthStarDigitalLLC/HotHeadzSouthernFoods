// ═══════════════════════════════════════════════════════════════════════════
// /api/chat.js — Vercel Serverless Function
//
// Receives visitor context + today's menu from the client, calls Claude,
// returns structured JSON for the AI slots on the landing page.
//
// REQUIRED ENV VAR (set in Vercel dashboard):
//   ANTHROPIC_API_KEY = sk-ant-...
//
// COST: ~$0.001 per visit with claude-haiku-4-5. Effectively free.
// LATENCY: typically 300-500ms end-to-end. Designed to fit in a 1s budget.
// ═══════════════════════════════════════════════════════════════════════════

export const config = {
  runtime: 'edge', // Edge runtime is faster for this kind of low-latency call
};

const MODEL = 'claude-haiku-4-5-20251001'; // fast + cheap + plenty smart enough for copy

// ═══ IN-MEMORY CACHE ═══
// Same visitor archetype hitting in the same 10-minute window? Reuse the response.
// "Archetype" = time-of-day bucket + day + weather + intent + isReturning.
// Most visits look the same to the AI anyway, so this cuts ~70-80% of API calls.
// (Edge function instances may not share memory perfectly — this is per-instance,
// which is fine: each instance still cuts its own repeat calls.)
const CACHE = new Map();
const CACHE_MS = 10 * 60 * 1000; // 10 minutes

function archetypeKey(payload) {
  const v = payload.visitor || {};
  const m = payload.menu || {};
  // 30-minute time buckets keep things fresh enough
  const halfHour = Math.floor((v.hour || 0) * 2) / 2;
  const intent = v.intent?.type || 'direct';
  const focus = v.intent?.focus || '';
  return [
    v.dayOfWeek,
    halfHour,
    v.timeOfDay,
    v.weather?.condition || 'none',
    intent,
    focus,
    v.isReturning ? 'return' : 'new',
    m.hasLunchPosted ? 'posted' : 'noLunch',
    // Include first 2 meats — if today's menu changes, regenerate
    (m.meats || []).slice(0, 2).join('|'),
  ].join('::');
}

function getCached(key) {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.t > CACHE_MS) {
    CACHE.delete(key);
    return null;
  }
  return entry.v;
}

function setCached(key, value) {
  CACHE.set(key, { t: Date.now(), v: value });
  // Prevent unbounded growth
  if (CACHE.size > 200) {
    const oldest = [...CACHE.entries()].sort((a, b) => a[1].t - b[1].t)[0][0];
    CACHE.delete(oldest);
  }
}

// ═══ THE BRAND VOICE — the most important part of this file ═══
// This is the system prompt that defines HOW Claude writes for HotHeadz.
// Owner-voice, never corporate, never apologetic, Southern but not cartoonish.
const SYSTEM_PROMPT = `You write web copy for Hot Headz Southern Foods — family-owned restaurant in DeRidder, Louisiana. Address: 2741 US-190, DeRidder, LA. Phone: (337) 221-1035. Open since 2020. Made-from-scratch Southern food.

VOICE: Owner-voice. Sounds like the woman running the kitchen at 5am wrote it. Direct, confident, warm, never performative. Southern but never cartoonish (no "y'all come back now"). Specific beats generic ("red beans on a Tuesday" not "comfort food"). Confident, not apologetic. Never use exclamation points. Avoid: delicious, amazing, perfect, best, authentic, experience, journey, passion. Use: fresh, made, fried, smoked, biscuits, kitchen, morning, plate, board, stove.

Return ONE JSON object — no markdown, no preamble — with these fields:

{
  "eyebrow": "5-word eyebrow above logo (e.g. 'Tuesday Lunch', 'DeRidder, Louisiana')",
  "titleEm": "Italic part after 'Hot Headz' — under 4 words (e.g. 'Southern Foods', 'Tuesday Lunch')",
  "pitch": "Main hero pitch — one sentence, 12-25 words",
  "ctaPrimary": "Primary button text, under 5 words",
  "ctaSecondary": "Secondary button text, under 4 words",
  "chalkboard": "Chalkboard message, 2-4 short lines. Use <br> for breaks. Use <span class='chalk-note'>margin note</span> and <span class='chalk-strike'>sold out</span> for chalk-style flourishes. If lunch posted, mention items with personality. If not, something like 'Kitchen's running. Call for today's board.'",
  "menuLede": "One sentence above menu cards, under 25 words",
  "storyProse": "Three short <p> paragraphs about Hot Headz. Adapt to visitor — returning gets warmer/shorter, Fort Polk military gets a nod, catering search gets that woven in",
  "contactLede": "One sentence above contact cards, under 25 words",
  "featuredDish": "Exact name from menu.meats to feature, or null if empty",
  "featuredPitch": "Under 14 words — why this dish for this visitor today, or null",
  "menuSectionOrder": "Array reordering menu.availableSections by relevance to visitor. Possible values: breakfast, sides, salad, beer, drinks, dessert. Morning → breakfast first. Hot day → drinks/salad first. Evening → beer first. Return all 6.",
  "featuredSection": "One section key to highlight as 'Picked for you', or null. Should match first item in menuSectionOrder."
}

Adapt copy to visitor.intent, visitor.timeOfDay, visitor.weather, visitor.isReturning. Use menu.meats and menu.sides when picking featured dish — never invent items.`;

const FALLBACK = {
  eyebrow: "DeRidder, Louisiana",
  titleEm: "Southern Foods",
  pitch: "Made from scratch every morning. Southern plates, Cajun classics, and the kind of cooking that makes you call your mama after.",
  ctaPrimary: "See today's menu",
  ctaSecondary: "Call to order",
  chalkboard: "Kitchen's running.<br>Call (337) 221-1035 for today's board.",
  menuLede: "Lunch changes every day. Here's what's on the board right now.",
  storyProse: "<p>Hot Headz started in 2020 with a simple idea: cook the way your grandmother cooked, every single day, no shortcuts. We fire up the kitchen before the sun comes up and we don't stop until lunch is done.</p><p>The biscuits get rolled by hand. The gravy gets stirred by someone watching it. The lunch plate that comes out at noon was decided on at five in the morning. That's the deal.</p><p>Family-owned. DeRidder-rooted. And every plate tells you so.</p>",
  contactLede: "Tap to call, get directions, or order through DoorDash. We're at 2741 US-190.",
  featuredDish: null,
  featuredPitch: null,
  menuSectionOrder: ['breakfast','sides','salad','beer','drinks','dessert'],
  featuredSection: null,
};

export default async function handler(req) {
  // CORS for same-origin and dev
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, corsHeaders);
  }

  // ═══ BLOCK BOTS — they don't need personalized copy, and they were
  // probably the source of unexpected API costs. The static fallback
  // gives Googlebot/etc. perfectly good content to crawl.
  const userAgent = (req.headers.get('user-agent') || '').toLowerCase();
  const BOT_PATTERNS = [
    'googlebot','bingbot','slurp','duckduckbot','baiduspider','yandexbot',
    'facebookexternalhit','twitterbot','linkedinbot','whatsapp','telegrambot',
    'discordbot','slackbot','applebot','ahrefsbot','semrushbot','mj12bot',
    'dotbot','rogerbot','exabot','crawler','spider','bot/','headlesschrome',
    'phantomjs','prerender','lighthouse','pagespeed','gtmetrix','pingdom',
    'uptimerobot','statuscake','newrelic','datadog','vercel-screenshot',
  ];
  if (BOT_PATTERNS.some(p => userAgent.includes(p))) {
    return json(FALLBACK, 200, Object.assign({ 'x-hh-cache': 'bot-skip' }, corsHeaders));
  }

  // ═══ BLOCK PRERENDER — Vercel sometimes prerenders pages at build time.
  // No actual visitor, so no point burning an API call.
  if (req.headers.get('x-vercel-prerender') === '1' || req.headers.get('x-prerender') === '1') {
    return json(FALLBACK, 200, Object.assign({ 'x-hh-cache': 'prerender-skip' }, corsHeaders));
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[api/chat] No ANTHROPIC_API_KEY set, returning fallback');
    return json(FALLBACK, 200, corsHeaders);
  }

  let payload;
  try {
    payload = await req.json();
  } catch(e) {
    return json({ error: 'Invalid JSON body' }, 400, corsHeaders);
  }

  // Validate basic shape
  if (!payload.visitor || !payload.menu) {
    return json(FALLBACK, 200, corsHeaders);
  }

  // ═══ CHECK CACHE FIRST ═══
  // If we've already generated copy for this visitor archetype recently, return it.
  // Saves ~70-80% of API calls in practice.
  const cacheKey = archetypeKey(payload);
  const cached = getCached(cacheKey);
  if (cached) {
    return json(cached, 200, Object.assign({ 'x-hh-cache': 'hit' }, corsHeaders));
  }

  // Build user message — give Claude the context as compact JSON
  const userMessage = `Visitor and menu context:
${JSON.stringify(payload)}

Generate the JSON response now. Owner voice. No clichés. Adapt to intent, time, weather.`;

  try {
    // Timeout race — we don't want the page hung waiting on the API
    const aiResponse = await Promise.race([
      callClaude(apiKey, userMessage),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Claude timeout')), 8000)),
    ]);
    // Cache the response for this archetype
    setCached(cacheKey, aiResponse);
    return json(aiResponse, 200, Object.assign({ 'x-hh-cache': 'miss' }, corsHeaders));
  } catch(e) {
    console.warn('[api/chat] Claude call failed:', e.message);
    return json(FALLBACK, 200, corsHeaders);
  }
}

async function callClaude(apiKey, userMessage) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      // System prompt cached — 90% discount on every call after the first
      // for ~5 minutes. Most visits hit the cache, paying ~$0.0002 instead of $0.0017
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!r.ok) {
    const errText = await r.text().catch(() => '');
    throw new Error(`Claude API error ${r.status}: ${errText.slice(0, 200)}`);
  }

  const data = await r.json();
  const textBlock = (data.content || []).find(b => b.type === 'text');
  if (!textBlock) throw new Error('No text content in Claude response');

  // Parse the JSON — strip any markdown fences just in case
  let text = textBlock.text.trim();
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch(e) {
    throw new Error('Claude returned invalid JSON: ' + text.slice(0, 200));
  }

  // Merge with fallback so missing fields don't break the page
  return Object.assign({}, FALLBACK, parsed);
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
  });
}
