const { expect } = require('@playwright/test');
const test = require('./fixtures');
const { REQUIRED_ARTICLES, parseTimestamp } = require('../pages/HackerNewsNewestPage');
const logger = require('../lib/logger');

const log = logger.child({ component: 'hackerNewsSort' });

test.describe('Hacker News Newest Page', () => {
  test('first 100 articles are sorted from newest to oldest', async ({
    hackerNewsNewestPage,
  }, testInfo) => {
    const articles = await hackerNewsNewestPage.getFirst100Articles();

    expect(articles).toHaveLength(REQUIRED_ARTICLES);

    // Attach enriched article data to report
    const articleData = hackerNewsNewestPage.getArticleData(articles);
    await testInfo.attach('article-data', {
      body: JSON.stringify(articleData, null, 2),
      contentType: 'application/json',
    });

    const violations = hackerNewsNewestPage.getSortViolations(articles);

    for (let i = 0; i < articles.length - 1; i++) {
      const current = parseTimestamp(articles[i].timestamp);
      const next = parseTimestamp(articles[i + 1].timestamp);
      const passed = current >= next;
      const icon = passed ? '✅' : '❌';
      console.log(
        `  ${String(i + 1).padStart(3, '0')}) [${icon}] ${articles[i].title}`
      );
      expect(
        current >= next,
        `Article ${i + 1} (${articles[i].timestamp}) should be newer than article ${i + 2} (${articles[i + 1].timestamp})`
      ).toBeTruthy();
    }
    console.log(
      `  ${String(articles.length).padStart(3, '0')}) [✅] ${articles[articles.length - 1].title}`
    );

    if (violations.length > 0) {
      await testInfo.attach('sort-violations', {
        body: JSON.stringify(violations, null, 2),
        contentType: 'application/json',
      });
    }

    log.info('Sort validation complete', { violations: violations.length });
    console.log(
      `\nPASS: All ${REQUIRED_ARTICLES} articles are sorted from newest to oldest. 🍻 Cheers 🍻`
    );
  });
});
