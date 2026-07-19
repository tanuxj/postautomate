require('dotenv').config();
const { generatePost } = require('./llm');
const { postTweet } = require('./twitter');
const { loadHistory, recordPost } = require('./history');
const { pickTopic } = require('./topics');

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const requiredVars = ['LLM_API_KEY'];
  if (!DRY_RUN) {
    requiredVars.push(
      'TWITTER_API_KEY',
      'TWITTER_API_SECRET',
      'TWITTER_ACCESS_TOKEN',
      'TWITTER_ACCESS_SECRET'
    );
  }
  const missing = requiredVars.filter((name) => !process.env[name]);
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    console.error('Copy .env.example to .env and fill these in.');
    process.exit(1);
  }

  const history = loadHistory();
  const lastTopicKey = history.length ? history[history.length - 1].topic : null;
  const topic = pickTopic(lastTopicKey);
  const recentForTopic = history
    .filter((entry) => entry.topic === topic.key)
    .slice(-8)
    .map((entry) => ({ subject: entry.subject, post: entry.post }));

  console.log(`Topic: ${topic.label}`);
  console.log('Generating post...');
  const { subject, post } = await generatePost(topic, recentForTopic);
  console.log(`Subject: ${subject}`);
  console.log(`Post (${post.length} chars): ${post}`);

  recordPost(
    { topic: topic.key, subject, post, date: new Date().toISOString() },
    history
  );

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Skipping publish to X (still recorded in history for topic/subject variety tracking).');
    return;
  }

  const tweet = await postTweet(post);
  console.log(`Posted: https://x.com/i/web/status/${tweet.id}`);
}

main().catch((err) => {
  console.error('Failed:', err.message || err);
  process.exit(1);
});
