const { test, expect } = require('@playwright/test');
const { HackerNewsNewestPage, REQUIRED_ARTICLES, parseTimestamp } = require('../pages/HackerNewsNewestPage');
const { getNewestStories } = require('../lib/apiClient');
const config = require('../config');
const logger = require('../lib/logger');

const log = logger.child({ component: 'crossValidation' });
const TITLE_OVERLAP_THRESHOLD = 0.8;
const TIMESTAMP_TOLERANCE_S = 60;

test.describe('Hacker News Cross-Validation (UI vs API)', () => {
  let uiArticles;
  let apiStories;

  test.beforeAll(async ({ browser }) => {
    // Collect UI articles
    const page = await browser.newPage();
    const hn = new HackerNewsNewestPage(page);
    await hn.goto();
    uiArticles = await hn.getFirst100Articles();
    await page.close();

    // Collect API stories
    apiStories = await getNewestStories(config.REQUIRED_ARTICLES);
  });

  test('both sources return sufficient articles', async ({}, testInfo) => {
    expect(uiArticles.length).toBe(REQUIRED_ARTICLES);
    expect(apiStories.length).toBeGreaterThanOrEqual(REQUIRED_ARTICLES);

    await testInfo.attach('cross-validation-counts', {
      body: JSON.stringify({ ui: uiArticles.length, api: apiStories.length }),
      contentType: 'application/json',
    });

    log.info('Both sources returned sufficient articles', {
      ui: uiArticles.length,
      api: apiStories.length,
    });
  });

  test('UI articles are sorted newest to oldest', () => {
    for (let i = 0; i < uiArticles.length - 1; i++) {
      const current = parseTimestamp(uiArticles[i].timestamp);
      const next = parseTimestamp(uiArticles[i + 1].timestamp);
      expect.soft(
        current >= next,
        `UI article ${i + 1} should be newer than ${i + 2}`
      ).toBeTruthy();
    }
  });

  test('API stories are sorted newest to oldest', () => {
    const items = apiStories.slice(0, REQUIRED_ARTICLES);
    for (let i = 0; i < items.length - 1; i++) {
      expect.soft(
        items[i].time >= items[i + 1].time,
        `API story ${i + 1} should be newer than ${i + 2}`
      ).toBeTruthy();
    }
  });

  test(`title overlap between UI and API exceeds ${TITLE_OVERLAP_THRESHOLD * 100}%`, async ({}, testInfo) => {
    const uiTitles = new Set(uiArticles.map((a) => a.title.trim()));
    const apiTitles = new Set(apiStories.slice(0, REQUIRED_ARTICLES).map((s) => s.title?.trim()));

    let matchCount = 0;
    for (const title of uiTitles) {
      if (apiTitles.has(title)) matchCount++;
    }

    const overlapRatio = matchCount / uiTitles.size;

    await testInfo.attach('title-overlap', {
      body: JSON.stringify({
        uiCount: uiTitles.size,
        apiCount: apiTitles.size,
        matched: matchCount,
        overlapRatio: Math.round(overlapRatio * 100) + '%',
        threshold: Math.round(TITLE_OVERLAP_THRESHOLD * 100) + '%',
      }, null, 2),
      contentType: 'application/json',
    });

    console.log(`Title overlap: ${matchCount}/${uiTitles.size} (${Math.round(overlapRatio * 100)}%)`);
    log.info('Title overlap calculated', { matchCount, overlapRatio });

    expect(
      overlapRatio,
      `Title overlap ${Math.round(overlapRatio * 100)}% is below ${TITLE_OVERLAP_THRESHOLD * 100}% threshold`
    ).toBeGreaterThanOrEqual(TITLE_OVERLAP_THRESHOLD);
  });

  test('matched stories have timestamps within tolerance', async ({}, testInfo) => {
    const apiByTitle = new Map();
    for (const story of apiStories.slice(0, REQUIRED_ARTICLES)) {
      if (story.title) apiByTitle.set(story.title.trim(), story);
    }

    const comparisons = [];
    let mismatchCount = 0;

    for (const article of uiArticles) {
      const apiStory = apiByTitle.get(article.title.trim());
      if (!apiStory) continue;

      const uiTime = parseTimestamp(article.timestamp);
      const apiTime = new Date(apiStory.time * 1000);
      const diffS = Math.abs(uiTime - apiTime) / 1000;
      const withinTolerance = diffS <= TIMESTAMP_TOLERANCE_S;

      if (!withinTolerance) mismatchCount++;

      comparisons.push({
        title: article.title,
        uiTime: uiTime.toISOString(),
        apiTime: apiTime.toISOString(),
        diffSeconds: Math.round(diffS),
        withinTolerance,
      });
    }

    await testInfo.attach('timestamp-comparisons', {
      body: JSON.stringify(comparisons, null, 2),
      contentType: 'application/json',
    });

    console.log(`Compared ${comparisons.length} matched stories, ${mismatchCount} outside ${TIMESTAMP_TOLERANCE_S}s tolerance`);

    expect(
      mismatchCount,
      `${mismatchCount} stories had timestamps differing by more than ${TIMESTAMP_TOLERANCE_S}s`
    ).toBe(0);
  });
});
