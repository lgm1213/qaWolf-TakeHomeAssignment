const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const logger = require('../../lib/logger');

const log = logger.child({ component: 'testRunner' });
const router = express.Router();
const runs = new Map();

router.post('/run-tests', (req, res) => {
  const { browser = 'chromium', suite = '' } = req.body || {};
  const runId = `run-${Date.now()}`;
  const projectRoot = path.resolve(__dirname, '..', '..');

  const args = ['playwright', 'test'];
  if (browser) args.push('--project', browser);
  if (suite) args.push(suite);

  log.info('Starting test run', { runId, browser, suite });

  const child = spawn('npx', args, {
    cwd: projectRoot,
    env: { ...process.env, FORCE_COLOR: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const run = {
    id: runId,
    status: 'running',
    startedAt: new Date().toISOString(),
    browser,
    suite,
    output: '',
    exitCode: null,
  };

  runs.set(runId, run);

  child.stdout.on('data', (data) => { run.output += data.toString(); });
  child.stderr.on('data', (data) => { run.output += data.toString(); });

  child.on('close', (code) => {
    run.status = code === 0 ? 'passed' : 'failed';
    run.exitCode = code;
    run.finishedAt = new Date().toISOString();
    log.info('Test run completed', { runId, status: run.status, exitCode: code });
  });

  child.on('error', (err) => {
    run.status = 'error';
    run.output += `\nError: ${err.message}`;
    log.error('Test run error', { runId, error: err.message });
  });

  res.json({ runId, status: 'running' });
});

router.get('/run-tests/:runId/status', (req, res) => {
  const run = runs.get(req.params.runId);
  if (!run) return res.status(404).json({ error: 'Run not found' });

  res.json({
    id: run.id,
    status: run.status,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt || null,
    browser: run.browser,
    suite: run.suite,
    exitCode: run.exitCode,
    output: run.output,
  });
});

module.exports = router;
