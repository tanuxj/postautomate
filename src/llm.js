const { BASE_PERSONA } = require('./topics');

const BASE_URL = process.env.LLM_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const MODEL = process.env.LLM_MODEL || 'gemini-3.1-flash-lite';

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

  let res;
  try {
    res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.LLM_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
  } catch (err) {
    if (err.name === 'TimeoutError') {
      throw new Error(`LLM request to ${BASE_URL} timed out after 30s (no response at all) — likely a network/DNS block on that host, not an API error.`);
    }
    throw new Error(`LLM request to ${BASE_URL} failed: ${err.message}`);
  }

  if (!res.ok) {
    throw new Error(`LLM API error ${res.status}: ${await res.text()}`);
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
    throw new Error(`Could not parse LLM response as JSON: ${raw}`);
  }

  if (!parsed.post || !parsed.subject) {
    throw new Error(`LLM response missing required fields: ${raw}`);
  }
  if (parsed.post.length > 280) {
    throw new Error(`Generated post is ${parsed.post.length} chars, over the 280 limit: ${parsed.post}`);
  }

  return parsed;
}

module.exports = { generatePost };
