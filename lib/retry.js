const config = require('../config');
const logger = require('./logger');

async function withRetry(fn, options = {}) {
  const {
    maxRetries = config.MAX_RETRIES,
    baseDelay = config.RETRY_BASE_DELAY_MS,
    shouldRetry = () => true,
    label = 'operation',
  } = options;

  const log = logger.child({ component: 'retry', label });

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      if (attempt > maxRetries || !shouldRetry(err, attempt)) {
        log.error(`Failed after ${attempt} attempt(s)`, { error: err.message });
        throw err;
      }
      const jitter = Math.random() * baseDelay * 0.5;
      const delay = baseDelay * Math.pow(2, attempt - 1) + jitter;
      log.warn(`Attempt ${attempt} failed, retrying in ${Math.round(delay)}ms`, {
        error: err.message,
        nextAttempt: attempt + 1,
      });
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

module.exports = { withRetry };
