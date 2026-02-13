// EDIT THIS FILE TO COMPLETE ASSIGNMENT QUESTION 1
const { chromium } = require("playwright");
const config = require("./config");
const logger = require("./lib/logger");

const log = logger.child({ component: "index" });
const REQUIRED_ARTICLES = config.REQUIRED_ARTICLES;

function parseTimestamp(ts) {
  return new Date(ts.split(" ")[0]);
}

async function collectArticles(page) {
  return page.$$eval("tr.athing", (rows) =>
    rows.map((row) => {
      const title = row.querySelector(".titleline > a")?.textContent || "Untitled";
      const nextRow = row.nextElementSibling;
      const timestamp = nextRow?.querySelector("span.age")?.getAttribute("title") || "";
      return { title, timestamp };
    })
  );
}

async function validateHackerNewsArticles() {
  const browser = await chromium.launch({ headless: config.HEADLESS });
  const page = await browser.newPage();

  log.info("Starting validation", { url: config.BASE_URL, requiredArticles: REQUIRED_ARTICLES });

  await page.goto(config.BASE_URL);
  await page.waitForSelector("span.age");

  const articles = [];

  // Collect articles, paginating until we have at least 100
  while (articles.length < REQUIRED_ARTICLES) {
    const pageArticles = await collectArticles(page);
    articles.push(...pageArticles);

    if (articles.length < REQUIRED_ARTICLES) {
      const moreLink = page.locator("a.morelink");
      await moreLink.click();
      await page.waitForSelector("span.age");
    }
  }

  // Use exactly the first 100
  const first100 = articles.slice(0, REQUIRED_ARTICLES);

  // Validate that articles are sorted newest to oldest
  let allPassed = true;
  for (let i = 0; i < first100.length - 1; i++) {
    const current = parseTimestamp(first100[i].timestamp);
    const next = parseTimestamp(first100[i + 1].timestamp);

    if (current < next) {
      allPassed = false;
      console.log(`  ${String(i + 1).padStart(3, "0")}) [❌] ${first100[i].title}`);
    } else {
      console.log(`  ${String(i + 1).padStart(3, "0")}) [✅] ${first100[i].title}`);
    }
  }
  // Log the last article
  const last = first100.length;
  console.log(`  ${String(last).padStart(3, "0")}) [✅] ${first100[last - 1].title}`);

  if (allPassed) {
    console.log(
      `\nPASS: All ${REQUIRED_ARTICLES} articles are sorted from newest to oldest. 🍻 Cheers 🍻`
    );
    log.info("Validation passed");
  } else {
    console.error(
      `\nFAIL: Articles are NOT correctly sorted from newest to oldest.`
    );
    log.error("Validation failed");
  }

  await browser.close();
}

(async () => {
  await validateHackerNewsArticles();
})();
