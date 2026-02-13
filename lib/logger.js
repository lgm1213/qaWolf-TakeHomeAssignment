const config = require('../config');

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

class Logger {
  constructor(context = {}) {
    this.context = context;
    this.threshold = LEVELS[config.LOG_LEVEL] ?? LEVELS.info;
  }

  child(extra) {
    return new Logger({ ...this.context, ...extra });
  }

  debug(message, meta) { this._log('debug', message, meta); }
  info(message, meta) { this._log('info', message, meta); }
  warn(message, meta) { this._log('warn', message, meta); }
  error(message, meta) { this._log('error', message, meta); }

  _log(level, message, meta) {
    if (LEVELS[level] < this.threshold) return;
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...(meta || {}),
    };
    process.stderr.write(JSON.stringify(entry) + '\n');
  }
}

module.exports = new Logger();
module.exports.Logger = Logger;
