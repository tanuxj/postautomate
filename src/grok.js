const { BASE_PERSONA } = require('./topics');

const XAI_URL = 'https://api.x.ai/v1/chat/completions';
const MODEL = process.env.XAI_MODEL || 'grok-4';

async function generatePost(topic, recentSubjects) {
  const avoidText = recentSubjects.length
    ? `Already covered recently under "${topic.label}" — do not repeat any of these:\n${recentSubjects
        .map((s) => `- ${s}`)
        .join('\n')}`
    : `Nothing posted yet under "${topic.label}".`;

  const systemPrompt = `${BASE_PERSONA}\n\n${topic.instructions}`;

  const body = {
    model: MODEL,
    temperature: 0.9,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `${avoidText}\n\nWrite today's post now. Respond with ONLY valid JSON, no markdown fences: {"subject": "short identifier of exactly what this post is about, for our own dedup tracking (e.g. a quote+author, a movie title, or a tech topic)", "post": "the final tweet text ready to publish"}`,
      },
    ],
  };

  const res = await fetch(XAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.XAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`xAI API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const raw = data.choices[0].message.content.trim();
  const jsonText = raw
    .replace(/^```(json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(`Could not parse Grok response as JSON: ${raw}`);
  }

  if (!parsed.post || !parsed.subject) {
    throw new Error(`Grok response missing required fields: ${raw}`);
  }
  if (parsed.post.length > 280) {
    throw new Error(`Generated post is ${parsed.post.length} chars, over the 280 limit: ${parsed.post}`);
  }

  return parsed;
}

module.exports = { generatePost };
