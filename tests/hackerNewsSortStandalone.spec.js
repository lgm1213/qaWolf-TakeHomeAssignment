const { test, expect } = require('@playwright/test');
const { HackerNewsNewestPage, REQUIRED_ARTICLES, parseTimestamp } = require('../pages/HackerNewsNewestPage');
const config = require('../config');
const logger = require('../lib/logger');

const log = logger.child({ component: 'hackerNewsSortStandalone' });

test.describe('Hacker News Newest Page (Standalone POM)', () => {
  test('first 100 articles are sorted from newest to oldest', async ({
    page,
  }, testInfo) => {
    const hackerNewsNewestPage = new HackerNewsNewestPage(page);
    await hackerNewsNewestPage.goto();

    const articles = await hackerNewsNewestPage.getFirst100Articles();

    expect(articles).toHaveLength(REQUIRED_ARTICLES);

    // Attach enriched article data to report
    const articleData = hackerNewsNewestPage.getArticleData(articles);
    await testInfo.attach('article-data', {
      body: JSON.stringify(articleData, null, 2),
      contentType: 'application/json',
    });

    for (let i = 0; i < articles.length - 1; i++) {
      const current = parseTimestamp(articles[i].timestamp);
      const next = parseTimestamp(articles[i + 1].timestamp);
      const passed = current >= next;
      const icon = passed ? '✅' : '❌';
      console.log(
        `  ${String(i + 1).padStart(3, '0')}) [${icon}] ${articles[i].title}`
      );
      expect.soft(
        current >= next,
        `Article ${i + 1} (${articles[i].timestamp}) should be newer than article ${i + 2} (${articles[i + 1].timestamp})`
      ).toBeTruthy();
    }
    console.log(
      `  ${String(articles.length).padStart(3, '0')}) [✅] ${articles[articles.length - 1].title}`
    );

    // Auto-screenshot on failure for standalone test
    if (config.SCREENSHOT_ON_FAILURE && testInfo.status !== testInfo.expectedStatus) {
      const screenshot = await page.screenshot({ fullPage: true });
      await testInfo.attach('failure-screenshot', {
        body: screenshot,
        contentType: 'image/png',
      });
    }

    log.info('Standalone sort validation complete');
    console.log(
      `\nPASS: All ${REQUIRED_ARTICLES} articles are sorted from newest to oldest. 🍻 Cheers 🍻`
    );
  });

  test('should fail when articles are sorted oldest to newest (negative test)', async ({
    page,
  }) => {
    const hackerNewsNewestPage = new HackerNewsNewestPage(page);
    await hackerNewsNewestPage.goto();

    const articles = await hackerNewsNewestPage.getFirst100Articles();

    expect(articles).toHaveLength(REQUIRED_ARTICLES);

    const reversed = [...articles].reverse();
    const failures = [];

    for (let i = 0; i < reversed.length - 1; i++) {
      const current = parseTimestamp(reversed[i].timestamp);
      const next = parseTimestamp(reversed[i + 1].timestamp);
      const passed = current >= next;
      const icon = passed ? '✅' : '❌';
      console.log(
        `  ${String(i + 1).padStart(3, '0')}) [${icon}] ${reversed[i].title}`
      );
      if (!passed) {
        failures.push(
          `Article ${i + 1} (${reversed[i].timestamp}) is older than article ${i + 2} (${reversed[i + 1].timestamp})`
        );
      }
    }
    console.log(
      `  ${String(reversed.length).padStart(3, '0')}) ${reversed[reversed.length - 1].title}`
    );

    console.log(
      `\nFAIL: ${failures.length} out of ${REQUIRED_ARTICLES - 1} comparisons were out of order. 😬 OooOoof 😬`
    );

    expect(failures, `Sort order violations:\n${failures.join('\n')}`).toHaveLength(0);
  });
});
