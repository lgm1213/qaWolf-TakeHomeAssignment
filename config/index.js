const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

function envBool(key, defaultValue) {
  const val = process.env[key];
  if (val === undefined) return defaultValue;
  return val === 'true' || val === '1';
}

function envInt(key, defaultValue) {
  const val = process.env[key];
  if (val === undefined) return defaultValue;
  const parsed = parseInt(val, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

const config = Object.freeze({
  BASE_URL: process.env.BASE_URL || 'https://news.ycombinator.com/newest',
  REQUIRED_ARTICLES: envInt('REQUIRED_ARTICLES', 100),
  HEADLESS: envBool('HEADLESS', true),
  BROWSER: process.env.BROWSER || 'chromium',
  API_BASE_URL: process.env.API_BASE_URL || 'https://hacker-news.firebaseio.com/v0',
  DASHBOARD_PORT: envInt('DASHBOARD_PORT', 3000),
  REPORTS_DIR: process.env.REPORTS_DIR || path.join(__dirname, '..', 'data', 'reports'),
  MAX_RETRIES: envInt('MAX_RETRIES', 3),
  RETRY_BASE_DELAY_MS: envInt('RETRY_BASE_DELAY_MS', 1000),
  SCREENSHOT_ON_FAILURE: envBool('SCREENSHOT_ON_FAILURE', true),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
});

module.exports = config;
