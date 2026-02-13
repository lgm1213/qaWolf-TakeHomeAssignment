# New Steps — QA Wolf Take-Home Enhancement

## New files (19)

- `config/index.js` — Central config with dotenv + defaults
- `lib/logger.js` — Structured JSON logger (hand-rolled)
- `lib/retry.js` — Exponential backoff + jitter retry utility
- `lib/apiClient.js` — HN Firebase API client with batched concurrency
- `tests/hackerNewsApi.spec.js` — API-level sort + schema validation
- `tests/hackerNewsCrossValidation.spec.js` — UI vs API cross-validation (80% overlap threshold)
- `reporters/jsonReporter.js` — Custom Playwright reporter generating JSON reports
- `dashboard/server.js` — Express dashboard server
- `dashboard/routes/api.js` — Report listing/detail/summary endpoints
- `dashboard/routes/testRunner.js` — Remote test execution via POST
- `dashboard/public/index.html` — Single-page dashboard
- `dashboard/public/css/styles.css` — Dark theme (GitHub-inspired), responsive CSS Grid
- `dashboard/public/js/app.js` — Client logic: data fetching, rendering, test run polling
- `dashboard/public/js/charts.js` — Hand-rolled Canvas line + bar charts
- `.env.example` — Documented environment variables
- `.github/workflows/test.yml` — CI: push, PR, daily cron, matrix browsers
- `Dockerfile` — Based on Playwright image
- `docker-compose.yml` — Exposes port 3000, mounts reports volume
- `.dockerignore`

## Updated files (8)

- `package.json` — Added express + dotenv deps, 6 npm scripts
- `playwright.config.js` — Custom JSON reporter, screenshot on failure, baseURL from config
- `index.js` — Uses config (backward compatible, `node index.js` still works)
- `pages/HackerNewsNewestPage.js` — Retry, logging, `getArticleData()`, `getSortViolations()`, `captureScreenshot()`
- `tests/fixtures.js` — Auto-screenshot on failure, testInfo integration
- `tests/hackerNewsSort.spec.js` — Attaches article data + violations to reports
- `tests/hackerNewsSortStandalone.spec.js` — Config integration, logger
- `.gitignore` — Added `.env`, `data/reports/*.json`
- `README.md` — Complete rewrite with architecture, config table, Docker/CI docs

## Only 2 new dependencies

express, dotenv — everything else hand-built.
