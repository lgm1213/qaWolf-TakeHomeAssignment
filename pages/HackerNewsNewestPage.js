const config = require('../config');
const logger = require('../lib/logger');
const { withRetry } = require('../lib/retry');

const REQUIRED_ARTICLES = config.REQUIRED_ARTICLES;
const log = logger.child({ component: 'HackerNewsNewestPage' });

function parseTimestamp(ts) {
  const parts = ts.split(' ');
  // If the title attribute contains a Unix timestamp as the second part, use it
  if (parts.length >= 2 && /^\d{10,}$/.test(parts[1])) {
    return new Date(parseInt(parts[1], 10) * 1000);
  }
  return new Date(parts[0]);
}

class HackerNewsNewestPage {
  constructor(page) {
    this.page = page;
    this.url = config.BASE_URL;
    this.ageSelector = 'span.age';
    this.articleRowSelector = 'tr.athing';
    this.moreLink = page.locator('a.morelink');
  }

  async goto() {
    await withRetry(
      async () => {
        await this.page.goto(this.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.page.waitForSelector(this.ageSelector, { timeout: 10000 });
      },
      { label: 'goto', maxRetries: config.MAX_RETRIES }
    );
    log.info('Navigated to Hacker News newest page', { url: this.url });
  }

  async collectArticlesFromPage() {
    return this.page.$$eval(this.articleRowSelector, (rows) =>
      rows.map((row) => {
        const titleEl = row.querySelector('.titleline > a');
        const title = titleEl?.textContent || 'Untitled';
        const url = titleEl?.href || '';
        const nextRow = row.nextElementSibling;
        const ageSpan = nextRow?.querySelector('span.age');
        const timestamp = ageSpan?.getAttribute('title') || '';
        return { title, timestamp, url };
      })
    );
  }

  async getFirst100Articles() {
    const articles = [];

    while (articles.length < REQUIRED_ARTICLES) {
      const pageArticles = await this.collectArticlesFromPage();
      articles.push(...pageArticles);
      log.debug(`Collected ${articles.length} articles so far`);

      if (articles.length < REQUIRED_ARTICLES) {
        await withRetry(
          async () => {
            await this.moreLink.click();
            await this.page.waitForSelector(this.ageSelector, { timeout: 10000 });
          },
          { label: 'pagination', maxRetries: 2 }
        );
      }
    }

    const result = articles.slice(0, REQUIRED_ARTICLES);
    log.info(`Collected ${result.length} articles`);
    return result;
  }

  getArticleData(articles) {
    return articles.map((article, index) => ({
      index: index + 1,
      title: article.title,
      timestamp: article.timestamp,
      parsedTime: parseTimestamp(article.timestamp).toISOString(),
      url: article.url || '',
    }));
  }

  getSortViolations(articles) {
    const violations = [];
    for (let i = 0; i < articles.length - 1; i++) {
      const current = parseTimestamp(articles[i].timestamp);
      const next = parseTimestamp(articles[i + 1].timestamp);
      if (current < next) {
        violations.push({
          index: i + 1,
          article: articles[i].title,
          articleTimestamp: articles[i].timestamp,
          nextArticle: articles[i + 1].title,
          nextTimestamp: articles[i + 1].timestamp,
          diffMs: next - current,
        });
      }
    }
    return violations;
  }

  isSortedNewestToOldest(articles) {
    return this.getSortViolations(articles).length === 0;
  }

  async captureScreenshot(name) {
    const path = `test-results/screenshot-${name}-${Date.now()}.png`;
    await this.page.screenshot({ path, fullPage: true });
    log.info('Screenshot captured', { path });
    return path;
  }
}

module.exports = { HackerNewsNewestPage, REQUIRED_ARTICLES, parseTimestamp };
