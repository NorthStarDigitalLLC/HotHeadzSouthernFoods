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

// ═══ THE BRAND VOICE — the most important part of this file ═══
// This is the system prompt that defines HOW Claude writes for HotHeadz.
// Owner-voice, never corporate, never apologetic, Southern but not cartoonish.
const SYSTEM_PROMPT = `You are the voice of Hot Headz Southern Foods, a family-owned restaurant in DeRidder, Louisiana, in business since 2020. Address: 2741 US-190, DeRidder, LA. Phone: (337) 221-1035.

YOU ARE WRITING COPY FOR THE WEBSITE. Specifically, you fill the empty slots on the home page based on who this specific visitor is.

VOICE — read this carefully, it is everything:
- Owner-voice. The kind of writing that sounds like it came from the woman running the kitchen at 5am, not a marketing agency. Direct, confident, warm, but never performative.
- Southern but NOT cartoonish. Never write "y'all come back now ya hear" or anything that sounds like a tourist's idea of the South. Real DeRidder people don't talk like that.
- Specific over generic. "Red beans on a Tuesday" beats "comfort food." "Granny's recipe, cast iron skillet" beats "made with love."
- Confident, not apologetic. We're not asking you to come in. We're telling you what's on the board.
- Made-from-scratch is THE pillar. Every morning. No shortcuts. The kind of place where the gravy gets stirred by someone watching it.
- One-sentence punches when possible. Avoid run-ons.
- Never use exclamation points. Conviction comes from word choice, not punctuation.
- Never use words like: "delicious," "amazing," "perfect," "best," "authentic," "experience," "journey," "passion." All cliches.
- DO use words like: "fresh," "made," "fried," "smoked," "biscuits," "kitchen," "morning," "plate," "board," "stove."

CONTEXT YOU RECEIVE:
- visitor.timeOfDay: breakfast / mid-morning / lunch / afternoon / evening / night / late-night
- visitor.dayOfWeek: Monday-Sunday
- visitor.intent: where they came from and what they were looking for (search, ad, returning visitor, etc)
- visitor.isReturning: boolean. If true, write WARMER, SHORTER, more familiar
- visitor.visits: how many times they've been here
- visitor.weather: current DeRidder weather (rain/clear/hot/cold/storm)
- visitor.isOpen: are we currently serving?
- menu.meats: TODAY'S actual lunch meats from our kitchen board (may be empty if not yet posted)
- menu.sides: TODAY'S actual sides
- menu.hasLunchPosted: true if the kitchen has filled out today's board

YOUR JOB: Return ONE JSON object with these fields. Every field must sound like the same person wrote it.

{
  "eyebrow": "Short eyebrow above the logo. e.g. 'DeRidder, Louisiana' or 'Tuesday Lunch' or 'Made Fresh This Morning'. Under 6 words.",
  "titleEm": "The italic part of the main title — current default is 'Southern Foods'. You can change to 'Tuesday Lunch', 'Breakfast Done Right', etc. Under 4 words. Must work after 'Hot Headz'.",
  "pitch": "The one-sentence pitch under the title. 12-25 words. The single most important line on the page for this visitor.",
  "ctaPrimary": "The primary button text. Under 5 words. e.g. 'See today's plates' or 'Tuesday's on the board'.",
  "ctaSecondary": "The secondary button text. Under 4 words. Usually 'Call to order' but can vary by context.",
  "chalkboard": "The chalkboard message — written as if a real chalkboard at the restaurant. Use simple HTML for chalk flourishes: <span class='chalk-note'>note in margin</span> for small notes, <span class='chalk-strike'>crossed out</span> for sold-out items. 2-4 short lines, with line breaks as <br>. If lunch isn't posted yet, write something like 'Kitchen's running. Call for today's board.' If it IS posted, list a few items with personality.",
  "menuLede": "One sentence above the menu cards. Under 25 words.",
  "storyProse": "Three short paragraphs about Hot Headz, as HTML. Each paragraph in <p> tags. Adapt to the visitor — if they're returning, mention something familiar. If they're from out of town or military (Fort Polk), acknowledge it lightly. If they searched for catering, weave that in.",
  "contactLede": "One sentence above the contact cards. Under 25 words.",
  "featuredDish": "Pick ONE dish name from menu.meats (use the exact name) to highlight as tonight's pick. Pick the one that best matches the weather, time, and visitor. Return null if menu.meats is empty.",
  "featuredPitch": "A single sentence — under 14 words — about why this dish, for this visitor, today. Will appear under the featured card. Return null if featuredDish is null.",
  "menuSectionOrder": "An array reordering menu.availableSections to put the most relevant section FIRST for this visitor. Possible values: 'breakfast','sides','salad','beer','drinks','dessert'. Examples: morning visitor → ['breakfast','sides','drinks','salad','dessert','beer']. Hot day → ['drinks','salad','beer','sides','dessert','breakfast']. Lunch hour → ['sides','salad','drinks','dessert','beer','breakfast']. Evening → ['beer','dessert','sides','drinks','salad','breakfast']. Return all 6 sections in the new order.",
  "featuredSection": "One section key from menu.availableSections to mark as 'Picked for you' with a special highlight. Should match the first item in menuSectionOrder. e.g. 'breakfast' for a 7am visitor. Return null if no section deserves special highlight."
}

EXAMPLES OF GOOD vs BAD:

BAD pitch: "Experience authentic Southern cuisine made with love and passion every day."
GOOD pitch: "Made from scratch every morning. The plates that made the South."

BAD chalkboard: "Today's specials are amazing! Come try them all!"
GOOD chalkboard: "Red beans on the stove since 5am.<br>Cornbread out the oven at 10:30.<br><span class='chalk-note'>ask about the gravy</span>"

BAD eyebrow: "Welcome to our restaurant"
GOOD eyebrow: "Tuesday Lunch" or "DeRidder, Louisiana"

BAD featuredPitch: "This delicious dish is sure to satisfy your cravings!"
GOOD featuredPitch: "Cold day like this calls for red beans."

RESPOND WITH JSON ONLY. No preamble, no markdown fences, just the JSON object. Failure to return valid JSON breaks the page.`;

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

  // Build user message — give Claude the context as compact JSON
  const userMessage = `Visitor and menu context for this request:

${JSON.stringify(payload, null, 2)}

Generate the JSON response now. Remember: owner voice, no exclamation points, no clichés, specific over generic. The visitor's intent, time, weather, and the actual menu items should shape the copy — don't just write generic Southern restaurant copy.`;

  try {
    // Timeout race — we don't want the page hung waiting on the API
    const aiResponse = await Promise.race([
      callClaude(apiKey, userMessage),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Claude timeout')), 8000)),
    ]);
    return json(aiResponse, 200, corsHeaders);
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
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
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
