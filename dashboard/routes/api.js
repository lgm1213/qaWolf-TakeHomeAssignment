const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('../../config');

const router = express.Router();

function getReportsDir() {
  return config.REPORTS_DIR;
}

function readReport(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function listReportFiles() {
  const dir = getReportsDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.startsWith('report-') && f.endsWith('.json'))
    .sort()
    .reverse();
}

// List all reports (metadata only)
router.get('/reports', (req, res) => {
  const files = listReportFiles();
  const reports = files.map((f) => {
    const report = readReport(path.join(getReportsDir(), f));
    if (!report) return null;
    return {
      id: report.id,
      timestamp: report.timestamp,
      duration: report.duration,
      summary: report.summary,
      file: f,
    };
  }).filter(Boolean);

  res.json(reports);
});

// Get latest report
router.get('/reports/latest', (req, res) => {
  const latestPath = path.join(getReportsDir(), 'latest.json');
  const report = readReport(latestPath);
  if (!report) return res.status(404).json({ error: 'No reports found' });
  res.json(report);
});

// Get specific report by ID
router.get('/reports/:id', (req, res) => {
  const files = listReportFiles();
  const dir = getReportsDir();

  for (const f of files) {
    const report = readReport(path.join(dir, f));
    if (report && report.id === req.params.id) {
      return res.json(report);
    }
  }

  res.status(404).json({ error: 'Report not found' });
});

// Aggregated summary across all runs
router.get('/summary', (req, res) => {
  const files = listReportFiles();
  const dir = getReportsDir();

  if (files.length === 0) {
    return res.json({
      totalRuns: 0,
      passRate: 0,
      avgDuration: 0,
      lastStatus: 'none',
      history: [],
    });
  }

  let totalPassed = 0;
  let totalTests = 0;
  let totalDuration = 0;
  let lastStatus = 'none';
  const history = [];

  for (const f of files) {
    const report = readReport(path.join(dir, f));
    if (!report) continue;

    totalPassed += report.summary.passed;
    totalTests += report.summary.total;
    totalDuration += report.duration;

    history.push({
      id: report.id,
      timestamp: report.timestamp,
      passed: report.summary.passed,
      failed: report.summary.failed,
      total: report.summary.total,
      duration: report.duration,
      status: report.summary.status,
    });
  }

  lastStatus = history.length > 0 ? history[0].status : 'none';

  res.json({
    totalRuns: files.length,
    passRate: totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0,
    avgDuration: files.length > 0 ? Math.round(totalDuration / files.length) : 0,
    lastStatus,
    history,
  });
});

module.exports = router;
