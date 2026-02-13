const fs = require('fs');
const path = require('path');
const config = require('../config');

const MAX_REPORTS = 50;

class JsonReporter {
  constructor() {
    this.results = [];
    this.startTime = null;
    this.suite = null;
  }

  onBegin(config, suite) {
    this.startTime = Date.now();
    this.suite = suite;
  }

  onTestEnd(test, result) {
    const attachments = {};
    for (const attachment of result.attachments || []) {
      if (attachment.contentType === 'application/json' && attachment.body) {
        try {
          attachments[attachment.name] = JSON.parse(attachment.body.toString());
        } catch {
          attachments[attachment.name] = attachment.body.toString();
        }
      }
    }

    this.results.push({
      title: test.title,
      suite: test.parent?.title || '',
      file: test.location?.file || '',
      status: result.status,
      duration: result.duration,
      retries: result.retry,
      error: result.error ? { message: result.error.message, stack: result.error.stack } : null,
      attachments,
    });
  }

  onEnd(result) {
    const duration = Date.now() - this.startTime;
    const runId = `run-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const passed = this.results.filter((r) => r.status === 'passed').length;
    const failed = this.results.filter((r) => r.status === 'failed').length;
    const skipped = this.results.filter((r) => r.status === 'skipped').length;
    const timedOut = this.results.filter((r) => r.status === 'timedOut').length;

    const report = {
      id: runId,
      timestamp,
      duration,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        browser: config.BROWSER,
        headless: config.HEADLESS,
      },
      summary: {
        total: this.results.length,
        passed,
        failed,
        skipped,
        timedOut,
        status: result.status,
      },
      tests: this.results,
    };

    const reportsDir = config.REPORTS_DIR;
    fs.mkdirSync(reportsDir, { recursive: true });

    const reportPath = path.join(reportsDir, `report-${Date.now()}.json`);
    const latestPath = path.join(reportsDir, 'latest.json');

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));

    // Prune old reports
    this._pruneReports(reportsDir);

    console.log(`\nJSON report written to: ${reportPath}`);
  }

  _pruneReports(dir) {
    try {
      const files = fs.readdirSync(dir)
        .filter((f) => f.startsWith('report-') && f.endsWith('.json'))
        .sort()
        .reverse();

      if (files.length > MAX_REPORTS) {
        for (const file of files.slice(MAX_REPORTS)) {
          fs.unlinkSync(path.join(dir, file));
        }
      }
    } catch {
      // ignore prune errors
    }
  }
}

module.exports = JsonReporter;
