# Cinema/Tech/Life Opinion Bot

Posts to X (Twitter) 4 times a day, at times that shift day to day, written by
an LLM to sound like an average person casually tweeting today — not a content
account, not a meme account running dated templates. Works with any
OpenAI-compatible chat completions API (defaults to Google Gemini's free tier;
xAI's Grok also works with a config change — see [src/llm.js](src/llm.js)).
Rotates across ten topics, weighted so the universal/relatable ones show up most
often (see the `weight` values in [src/topics.js](src/topics.js)), all voiced as
a guy born in 2003, based in Hyderabad, who did BTech CSE in India and now works
as a developer. The current date is also fed into the prompt so weather/seasonal/
festival mentions stay plausible instead of guessed:

- **Everyday relatable thoughts** (weight 4) — sincere, current, "wait, same"
  observations about small daily-life moments. Not joke-shaped.
- **Sarcastic humor** (weight 3) — text-only, dry/sarcastic tweets about
  relatable everyday life stuff, written in plain sentence form rather than
  recycled meme templates. No real people, companies, politics, or religion
  as targets — just universal annoyances.
- **Indian music & web series** (weight 3) — relatable posts about songs,
  artists, moods, and Indian/OTT web series — reactions, binge moments,
  finales, not reviews.
- **Food** (weight 2) — street food, chai/coffee habits, hostel vs home food,
  cravings, cooking wins/fails.
- **2010s Indian childhood nostalgia** (weight 2) — cartoons, summer
  vacations, first phone, school days — warm, not sarcastic.
- **Hometown vs city life & money** (weight 2) — missing home, rent/salary/
  UPI spending, hometown-vs-Hyderabad pace.
- **Stoic wisdom, relatable framing** (weight 2) — real stoic ideas (Marcus
  Aurelius, Seneca, Epictetus) delivered as a personal thought, rarely naming
  the philosopher — not a history-lesson quote block.
- **Underrated Indian regional cinema** (weight 1) — opinions/recommendations
  on underseen Telugu, Malayalam, Tamil (occasionally Kannada/Bengali/Marathi)
  films — deliberately low weight, roughly 1-2 posts/week.
- **Engineering college & developer work life** (weight 1) — BTech CSE
  college memories (hostel, backlogs, placements) and current dev-job life
  (standups, WFH, AI-assisted coding, appraisals).
- **Tech opinions** (weight 1) — casual subjective takes on tools, gadgets,
  dev practices, AI, etc., tied to today's tech conversation where it fits.

Runs as a scheduled script — no browser needs to be open.

## 1. Get your API keys

**LLM — Google Gemini (free), default:**
1. Go to https://aistudio.google.com/apikey, sign in, generate an API key.
2. Free tier rate limits vary by model, but easily cover 4 requests/day.
3. Uses Gemini's OpenAI-compatible endpoint, so no extra SDK is needed —
   same `fetch` call as any other provider.

**LLM — xAI Grok (paid alternative):**
1. Go to https://console.x.ai, create an account, generate an API key.
2. Pay-as-you-go, not free — expect well under $1/month at this volume.
3. Set `LLM_BASE_URL=https://api.x.ai/v1/chat/completions` and
   `LLM_MODEL=grok-4` in `.env`.

**X (Twitter) API:**
1. Go to https://developer.x.com/en/portal/dashboard, create a Project + App
   (Free tier is enough for posting).
2. In the App's "User authentication settings", enable OAuth 1.0a with
   **Read and Write** permissions.
3. Under "Keys and tokens", generate:
   - API Key & Secret (consumer keys)
   - Access Token & Secret — **regenerate these after** setting Read+Write
     permissions, or they'll be stuck as read-only.

## 2. Configure

```
cp .env.example .env
```

Fill in all five values in `.env`.

## 3. Disclose the account as automated

Per X's Automation Rules, add something like this to the account bio, e.g.:

> 🤖 Automated | Daily historical quotes, curated by AI | not a real person

This keeps you compliant and avoids suspension risk. The posts themselves
don't need a disclaimer in the text — just the bio.

## 4. Install and test

```
npm install
npm run dry-run
```

This generates a post and prints it without publishing, so you can sanity-check
tone/length before connecting it to your real account. Run it a few times to
get a feel for the variety.

When you're happy with it:

```
npm run post
```

This actually publishes to X and records the quote in `data/history.json` so
future posts avoid repeating it.

## 5. Schedule 4 posts/day at shifting times (Windows Task Scheduler)

One task, **4 triggers**, each with a random delay — Task Scheduler
re-randomizes the delay every day it fires, so the actual post time never
lands on the same clock minute twice, while staying roughly spread across
the day.

1. Open Task Scheduler → Create Task (not "Create Basic Task" — the random
   delay option only appears in the full dialog).
2. **General**: name it (e.g. `quote-bot`). Check "Run whether user is logged
   on or not" if you want it to fire even when locked.
3. **Triggers** tab → New, four times, using these base times and delays:

   | Base time | Random delay |
   |---|---|
   | 9:00 AM  | 1 hour 30 minutes |
   | 1:00 PM  | 1 hour 30 minutes |
   | 5:00 PM  | 1 hour 30 minutes |
   | 9:00 PM  | 1 hour 30 minutes |

   For each: set "Daily", pick the base time, then check **"Delay task for
   up to (random delay):"** and set it to 1 hour 30 minutes. Repeat for all 4
   so the task ends up with 4 trigger entries.
4. **Actions** tab → New → Start a program:
   - Program/script: full path to `node.exe` (find it with `where node` in
     PowerShell)
   - Arguments: `src/index.js`
   - Start in: this project's full folder path (so `.env` and `data/` resolve)
5. **Settings** tab: check "Run task as soon as possible after a scheduled
   start is missed" so a day your PC is off isn't just silently skipped, and
   check **"If the task is already running, then... Run a new instance in
   parallel"** is NOT selected — leave it at the default ("Do not start a new
   instance") so overlapping random delays can't double-fire.

Each of the 4 firings is one `npm run post` run, so `data/history.json`
already ensures the 2nd–4th post of the day doesn't repeat the 1st–3rd.

## Notes on scope

- **Auto-reply is intentionally not included.** Reading mentions/replies
  requires X API's Basic tier (~$100/month), whereas posting works on the
  Free tier. Add it later if the account gains enough traction to justify
  the cost — the same `grok.js` pattern extends to generating replies.
- Topics are picked with weighted randomness (`pickTopic` in
  [src/topics.js](src/topics.js)) and won't repeat back-to-back. Adjust the
  `weight` values there to shift how often each topic comes up.
- History is capped at the last 200 posts (`data/history.json`), tagged by
  topic, and fed back to Grok per-topic as a "don't repeat these" list — so
  the cinema/tech/quote pools each avoid their own recent repeats.
- Quote and movie authenticity is enforced only via prompting ("use something
  real and well-documented, skip it if you're not confident") — Grok can
  still occasionally get a fact wrong. Spot-check dry-runs periodically,
  especially early on.
