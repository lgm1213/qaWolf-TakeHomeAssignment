const { test, expect } = require('@playwright/test');
const { getNewestStories } = require('../lib/apiClient');
const config = require('../config');
const logger = require('../lib/logger');

const log = logger.child({ component: 'hackerNewsApi' });

test.describe('Hacker News API Validation', () => {
  let stories;

  test.beforeAll(async () => {
    stories = await getNewestStories(config.REQUIRED_ARTICLES);
  });

  test('API returns the expected number of newest stories', async ({}, testInfo) => {
    expect(stories.length).toBeGreaterThanOrEqual(config.REQUIRED_ARTICLES);

    await testInfo.attach('api-stories', {
      body: JSON.stringify(
        stories.slice(0, config.REQUIRED_ARTICLES).map((s, i) => ({
          index: i + 1,
          id: s.id,
          title: s.title,
          time: s.time,
          isoTime: new Date(s.time * 1000).toISOString(),
        })),
        null,
        2
      ),
      contentType: 'application/json',
    });

    log.info(`API returned ${stories.length} stories`);
  });

  test('each story has required schema fields', () => {
    for (const story of stories.slice(0, config.REQUIRED_ARTICLES)) {
      expect(story).toHaveProperty('id');
      expect(story).toHaveProperty('title');
      expect(story).toHaveProperty('time');
      expect(story).toHaveProperty('type');
      expect(typeof story.id).toBe('number');
      expect(typeof story.title).toBe('string');
      expect(typeof story.time).toBe('number');
    }
  });

  test('stories are sorted by time descending (newest first)', () => {
    const items = stories.slice(0, config.REQUIRED_ARTICLES);
    const violations = [];

    for (let i = 0; i < items.length - 1; i++) {
      if (items[i].time < items[i + 1].time) {
        violations.push({
          index: i + 1,
          article: items[i].title,
          time: items[i].time,
          nextArticle: items[i + 1].title,
          nextTime: items[i + 1].time,
        });
      }
    }

    if (violations.length > 0) {
      log.warn('API sort violations found', { count: violations.length });
      console.log(`Found ${violations.length} sort violations in API data`);
      violations.forEach((v) => {
        console.log(
          `  ❌ #${v.index} "${v.article}" (${v.time}) < #${v.index + 1} "${v.nextArticle}" (${v.nextTime})`
        );
      });
    }

    expect(violations, `${violations.length} sort violations found in API response`).toHaveLength(0);
    log.info('API sort validation passed');
    console.log(`\nPASS: All ${items.length} stories from API are sorted newest to oldest.`);
  });
});
