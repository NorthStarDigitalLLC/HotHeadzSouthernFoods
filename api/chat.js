export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { system, messages } = req.body || {};

    const input = [];

    if (system) {
      input.push({
        role: 'system',
        content: [{ type: 'input_text', text: system }]
      });
    }

    for (const msg of messages || []) {
      input.push({
        role: msg.role,
        content: [{ type: 'input_text', text: msg.content }]
      });
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input
      })
    });

    const data = await response.json();

    const reply =
      data.output_text ||
      "Sorry, something went wrong. Call us at (337) 221-1035.";

    res.status(200).json({ reply });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
