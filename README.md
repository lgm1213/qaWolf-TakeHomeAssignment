# QA Wolf Take-Home Assignment

![CI](https://github.com/luismejia/qaWolfTakeHome/actions/workflows/test.yml/badge.svg)

> Automated validation that the first 100 articles on [Hacker News/newest](https://news.ycombinator.com/newest) are sorted from newest to oldest — with a real-time dashboard, API cross-validation, and multi-browser CI.

---

## Architecture

```
index.js                     # Standalone script (node index.js)
config/index.js              # Central config (dotenv + defaults)
lib/
  logger.js                  # Structured JSON logger (hand-rolled)
  retry.js                   # Exponential backoff + jitter
  apiClient.js               # HN Firebase API client (native fetch)
pages/
  HackerNewsNewestPage.js    # Page Object Model
tests/
  fixtures.js                # Playwright fixtures (auto-screenshot on failure)
  hackerNewsSort.spec.js     # UI sort validation (fixtures)
  hackerNewsSortStandalone.spec.js  # UI sort validation (standalone POM)
  hackerNewsApi.spec.js      # API-level sort validation
  hackerNewsCrossValidation.spec.js # UI vs API cross-validation
reporters/
  jsonReporter.js            # Custom Playwright reporter -> JSON
dashboard/
  server.js                  # Express dashboard
  routes/api.js              # Report API endpoints
  routes/testRunner.js       # Remote test execution
  public/                    # SPA frontend (dark theme, Canvas charts)
```

## Quick Start

```bash
# Install dependencies
npm install
npx playwright install

# Run the original script
node index.js

# Run all tests (all browsers)
npm test

# Run tests for a specific browser
npm run test:chromium

# Run API-only tests
npm run test:api

# Run cross-validation tests
npm run test:cross

# Start the dashboard
npm start
# Open http://localhost:3000
```

## Dashboard

The dashboard provides:
- **Summary cards** — total runs, pass rate, avg duration, last status
- **Run Tests panel** — trigger test runs from the browser with browser/suite selection
- **Pass/Fail trend chart** — Canvas line chart of test results over time
- **Execution time chart** — Canvas bar chart of run durations
- **Test details** — expandable per-test results with error messages
- **Article data table** — 100 articles with sort-violation highlighting

## Test Suites

| Suite | File | What it validates |
|-------|------|-------------------|
| UI Sort (Fixtures) | `hackerNewsSort.spec.js` | 100 articles sorted newest-to-oldest via Playwright fixtures |
| UI Sort (Standalone) | `hackerNewsSortStandalone.spec.js` | Same validation + negative test, standalone POM |
| API Validation | `hackerNewsApi.spec.js` | HN Firebase API returns sorted stories with correct schema |
| Cross-Validation | `hackerNewsCrossValidation.spec.js` | UI vs API: both sorted, >80% title overlap, timestamps within 60s |

## Configuration

All settings can be overridden via `.env` (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `https://news.ycombinator.com/newest` | Target URL |
| `REQUIRED_ARTICLES` | `100` | Number of articles to validate |
| `HEADLESS` | `true` | Browser headless mode |
| `BROWSER` | `chromium` | Default browser |
| `API_BASE_URL` | `https://hacker-news.firebaseio.com/v0` | HN API base |
| `DASHBOARD_PORT` | `3000` | Dashboard server port |
| `MAX_RETRIES` | `3` | Retry attempts for flaky operations |
| `RETRY_BASE_DELAY_MS` | `1000` | Base delay for exponential backoff |
| `SCREENSHOT_ON_FAILURE` | `true` | Auto-capture screenshots on test failure |
| `LOG_LEVEL` | `info` | Logger level (debug/info/warn/error) |

## Docker

```bash
# Build and run
docker-compose up

# Dashboard available at http://localhost:3000
# Run tests from the dashboard UI or:
docker-compose exec dashboard npx playwright test --project=chromium
```

## CI/CD

GitHub Actions workflow runs on:
- Push to `main`
- Pull requests
- Daily schedule (6 AM UTC)
- Manual dispatch

Matrix strategy tests across Chromium, Firefox, and WebKit. Test reports and screenshots are uploaded as artifacts.

## Design Decisions

1. **Only 2 new dependencies** (express, dotenv) — logger, retry, charts, and reporter are hand-built to demonstrate engineering ability
2. **JSON file storage** — simple, debuggable, zero setup; test report volume never justifies a database
3. **Canvas API charts** — hand-rolled line and bar charts show front-end fundamentals without chart libraries
4. **Cross-validation with 80% threshold** — accounts for real timing differences between UI scraping and API calls
5. **Backward compatibility** — `node index.js` works exactly as the original assignment requires
6. **Custom Playwright reporter** — generates structured JSON reports consumed by the dashboard API
7. **Exponential backoff with jitter** — production-grade retry strategy for flaky network operations

---

*Luis Mejia — QA Wolf Take-Home*
