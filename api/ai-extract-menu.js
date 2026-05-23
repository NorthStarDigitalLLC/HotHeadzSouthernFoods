/**
 * /api/ai-extract-menu.js
 * 
 * Vercel serverless function. Receives a base64-encoded photo of a handwritten
 * (or printed) daily menu list and returns structured meats/sides with
 * descriptions in the editor's "Name | Description" format.
 *
 * The Anthropic API key NEVER leaves the server. It's read from
 * process.env.ANTHROPIC_API_KEY, set in Vercel's project settings.
 */

export default async function handler(req, res) {
  // CORS — only same-origin or thefrancismokehouse.com / hotheadz hosts
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server not configured — ANTHROPIC_API_KEY missing in Vercel env vars' });
  }

  try {
    const { imageBase64, imageMediaType } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required' });

    const mediaType = imageMediaType || 'image/jpeg';
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(mediaType)) {
      return res.status(400).json({ error: 'Unsupported image type. Use JPEG, PNG, GIF, or WEBP.' });
    }

    // The prompt that shapes Claude's output. Keep it tight & specific.
    const systemPrompt = `You read photos of handwritten or printed daily menu lists for a Southern restaurant called Hot Headz Southern Foods. You output the items in a strict JSON format with short, appetizing one-line descriptions.

CRITICAL RULES:
1. Output JSON ONLY. No markdown, no backticks, no commentary, no preamble.
2. Split items into "meats" (main proteins/entrees) vs "sides" (vegetables, starches, breads).
3. Each item gets one short, appetizing description (8-15 words). Restaurant-menu tone — descriptive but not flowery.
4. Common Southern items have known descriptions — use them naturally:
   - Red Beans & Rice → "Slow-cooked red beans served over seasoned rice"
   - Pulled Pork → "Tender pulled pork with savory BBQ flavor"
   - Mac & Cheese → "Creamy baked macaroni and cheese, Southern style"
   - Mashed Potatoes → "Creamy mashed potatoes with rich gravy"
   - Mexican Corn → "Sweet corn with a creamy, seasoned Mexican-style flavor"
   - Dirty Rice → "Seasoned rice with bold Cajun flavor"
   - Cornbread → "Warm Southern cornbread, slightly sweet"
   - Garlic Bread → "Toasted bread with buttery garlic flavor"
   - Green Beans → "Seasoned green beans cooked until tender"
   - Cabbage → "Tender seasoned cabbage"
   - Baked Beans → "Sweet and savory baked beans"
   - Potato Salad → "Creamy potato salad served chilled"
5. Use proper title case ("Red Beans & Rice", not "red beans & rice").
6. Use "&" not "and" when joining short words ("Red Beans & Rice", "Mac & Cheese").
7. Ignore non-food lines (dates, headers, totals, notes).
8. If you can't read an item clearly, OMIT it (don't guess wildly).

CLASSIFICATION HELP:
MEATS/MAINS: brisket, pulled pork, chicken (any prep), beef tips, meatloaf, casseroles with protein in the name, fish, shrimp, sausage, ribs, ham, turkey, red beans & rice (counts as a main).
SIDES: cabbage, green beans, corn, mac & cheese, mashed potatoes, dirty rice, white rice, potato salad, coleslaw, baked beans, cornbread, rolls, biscuits, garlic bread, sweet potatoes, fried okra, hush puppies, salad, broccoli, carrots, dressing/stuffing.

OUTPUT FORMAT (exact):
{
  "meats": [
    {"name": "Red Beans & Rice", "desc": "Slow-cooked red beans served over seasoned rice"}
  ],
  "sides": [
    {"name": "Cabbage", "desc": "Tender seasoned cabbage"}
  ]
}`;

    const anthropicReq = {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 }
          },
          {
            type: 'text',
            text: 'Extract the lunch menu items from this photo. Return JSON only.'
          }
        ]
      }]
    };

    const apiResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify(anthropicReq)
    });

    const apiText = await apiResp.text();
    if (!apiResp.ok) {
      console.error('Anthropic API error:', apiResp.status, apiText);
      return res.status(502).json({ error: `Anthropic API error (${apiResp.status}): ${apiText.slice(0, 500)}` });
    }

    let apiData;
    try { apiData = JSON.parse(apiText); }
    catch (e) { return res.status(502).json({ error: 'Anthropic returned non-JSON: ' + apiText.slice(0, 300) }); }

    // Extract the text content from Anthropic's response
    const textBlock = (apiData.content || []).find(b => b.type === 'text');
    if (!textBlock || !textBlock.text) {
      return res.status(502).json({ error: 'No text returned from Claude', raw: apiData });
    }

    // Parse the JSON Claude returned
    let extracted;
    try {
      // Strip any markdown code fences if Claude added them despite instructions
      const cleaned = textBlock.text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      extracted = JSON.parse(cleaned);
    } catch (e) {
      return res.status(502).json({ 
        error: 'Could not parse Claude response as JSON', 
        rawText: textBlock.text 
      });
    }

    // Validate shape
    const meats = Array.isArray(extracted.meats) ? extracted.meats.filter(i => i && i.name) : [];
    const sides = Array.isArray(extracted.sides) ? extracted.sides.filter(i => i && i.name) : [];

    return res.status(200).json({
      success: true,
      meats,
      sides,
      // Pre-format the strings for direct paste into the editor's textareas
      meatsText: meats.map(i => i.desc ? `${i.name} | ${i.desc}` : i.name).join('\n'),
      sidesText: sides.map(i => i.desc ? `${i.name} | ${i.desc}` : i.name).join('\n'),
      usage: apiData.usage || null
    });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Server error: ' + (err.message || String(err)) });
  }
}

// Vercel config — accept larger JSON bodies for base64 photos (up to ~6MB)
export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } }
};
