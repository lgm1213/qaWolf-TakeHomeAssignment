const config = require('../config');
const logger = require('./logger');
const { withRetry } = require('./retry');

const log = logger.child({ component: 'apiClient' });
const CONCURRENCY_LIMIT = 10;

async function fetchJson(url) {
  return withRetry(
    async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return res.json();
    },
    { label: `fetch ${url}`, maxRetries: config.MAX_RETRIES }
  );
}

async function getNewestStoryIds(count = 100) {
  const url = `${config.API_BASE_URL}/newstories.json`;
  log.info('Fetching newest story IDs', { url, count });
  const ids = await fetchJson(url);
  return ids.slice(0, count);
}

async function getStory(id) {
  return fetchJson(`${config.API_BASE_URL}/item/${id}.json`);
}

async function getStories(ids) {
  const stories = [];
  for (let i = 0; i < ids.length; i += CONCURRENCY_LIMIT) {
    const batch = ids.slice(i, i + CONCURRENCY_LIMIT);
    const results = await Promise.all(batch.map((id) => getStory(id)));
    stories.push(...results);
    log.debug(`Fetched ${stories.length}/${ids.length} stories`);
  }
  return stories.filter(Boolean);
}

async function getNewestStories(count = 100) {
  const ids = await getNewestStoryIds(count);
  const stories = await getStories(ids);
  log.info(`Retrieved ${stories.length} stories from API`);
  return stories;
}

module.exports = { getNewestStoryIds, getStory, getStories, getNewestStories };
