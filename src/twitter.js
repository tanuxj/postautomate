const { TwitterApi } = require('twitter-api-v2');

function getClient() {
  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  });
  return client.readWrite;
}

async function postTweet(text) {
  const client = getClient();
  const { data } = await client.v2.tweet(text);
  return data;
}

module.exports = { postTweet };
