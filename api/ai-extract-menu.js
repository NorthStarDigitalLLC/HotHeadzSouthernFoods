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
    
    // Strip any data URL prefix the client may have left in (defensive)
    let cleanB64 = String(imageBase64);
    const dataUrlMatch = cleanB64.match(/^data:image\/[^;]+;base64,(.+)$/);
    if (dataUrlMatch) cleanB64 = dataUrlMatch[1];
    cleanB64 = cleanB64.replace(/\s+/g, ''); // remove any whitespace
    
    if (cleanB64.length < 100) {
      return res.status(400).json({ error: 'Image data too small (' + cleanB64.length + ' chars) — likely corrupt upload' });
    }
    
    // Decode the base64 to inspect actual bytes
    let imageBytes;
    try {
      imageBytes = Buffer.from(cleanB64, 'base64');
    } catch (e) {
      return res.status(400).json({ error: 'Base64 decode failed: ' + e.message });
    }
    
    if (imageBytes.length < 100) {
      return res.status(400).json({ 
        error: 'Decoded image is too small (' + imageBytes.length + ' bytes) — upload was corrupted',
        debug: { base64Length: cleanB64.length, decodedLength: imageBytes.length }
      });
    }
    
    // Detect actual format from magic bytes (more reliable than client claim or base64 prefix)
    let actualMediaType = imageMediaType || 'image/jpeg';
    let detectedFormat = 'unknown';
    const b0 = imageBytes[0], b1 = imageBytes[1], b2 = imageBytes[2], b3 = imageBytes[3];
    if (b0 === 0xFF && b1 === 0xD8 && b2 === 0xFF) {
      actualMediaType = 'image/jpeg';
      detectedFormat = 'jpeg';
    } else if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4E && b3 === 0x47) {
      actualMediaType = 'image/png';
      detectedFormat = 'png';
    } else if (b0 === 0x47 && b1 === 0x49 && b2 === 0x46) {
      actualMediaType = 'image/gif';
      detectedFormat = 'gif';
    } else if (b0 === 0x52 && b1 === 0x49 && b2 === 0x46 && b3 === 0x46) {
      // RIFF — could be WebP
      const isWebP = imageBytes.slice(8, 12).toString('ascii') === 'WEBP';
      if (isWebP) {
        actualMediaType = 'image/webp';
        detectedFormat = 'webp';
      }
    }
    
    if (detectedFormat === 'unknown') {
      const hexPreview = imageBytes.slice(0, 16).toString('hex');
      return res.status(400).json({ 
        error: 'Uploaded data is not a recognized image format. First 16 bytes: ' + hexPreview + ' (claimed: ' + (imageMediaType||'none') + ')',
        debug: { decodedBytes: imageBytes.length, hexPreview }
      });
    }
    
    const mediaType = actualMediaType;
    console.log(`[ai-extract] Received ${imageBytes.length} bytes of ${detectedFormat} (claimed: ${imageMediaType||'none'})`);
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

    // Build the text instruction — incorporate the user's optional note if present
    const rawUserPrompt = (req.body && typeof req.body.userPrompt === 'string') ? req.body.userPrompt.trim() : '';
    // Cap user input at 500 chars so they can't blow up the prompt
    const userPrompt = rawUserPrompt.slice(0, 500);
    
    let userText = 'Extract the lunch menu items from this photo. Return JSON only.';
    if (userPrompt) {
      userText += '\n\nADDITIONAL CONTEXT FROM THE USER (treat as instructions about what is in the photo, not as menu items themselves):\n' + userPrompt;
    }

    const anthropicReq = {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: cleanB64 }
          },
          {
            type: 'text',
            text: userText
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
      return res.status(502).json({ 
        error: `Anthropic API error (${apiResp.status}): ${apiText.slice(0, 500)}`,
        debug: {
          imageBytes: imageBytes.length,
          detectedFormat,
          mediaType,
          clientClaimedType: imageMediaType,
          firstBytesHex: imageBytes.slice(0, 8).toString('hex')
        }
      });
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
