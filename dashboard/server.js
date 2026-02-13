const express = require('express');
const path = require('path');
const config = require('../config');
const apiRoutes = require('./routes/api');
const testRunnerRoutes = require('./routes/testRunner');
const logger = require('../lib/logger');

const log = logger.child({ component: 'dashboard' });
const app = express();
const PORT = config.DASHBOARD_PORT;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', apiRoutes);
app.use('/api', testRunnerRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  log.info(`Dashboard running at http://localhost:${PORT}`);
  console.log(`\n  Dashboard running at http://localhost:${PORT}\n`);
});

module.exports = app;
