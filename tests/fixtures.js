const base = require('@playwright/test');
const { HackerNewsNewestPage } = require('../pages/HackerNewsNewestPage');
const config = require('../config');

module.exports = base.test.extend({
  hackerNewsNewestPage: async ({ page }, use, testInfo) => {
    const hackerNewsNewestPage = new HackerNewsNewestPage(page);
    await hackerNewsNewestPage.goto();
    await use(hackerNewsNewestPage);

    // Auto-screenshot on failure
    if (config.SCREENSHOT_ON_FAILURE && testInfo.status !== testInfo.expectedStatus) {
      const screenshot = await page.screenshot({ fullPage: true });
      await testInfo.attach('failure-screenshot', {
        body: screenshot,
        contentType: 'image/png',
      });
    }
  },
});
