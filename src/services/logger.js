const fs = require('fs');
const { config } = require('../config/env');

const LOGS_FILE = config.paths.logs;
const MAX_LOGS = config.logs.maxEntries;

function loadLogs() {
  try {
    if (fs.existsSync(LOGS_FILE)) {
      return JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
    }
  } catch (err) {
    console.log('Error reading logs:', err.message);
  }
  return [];
}

function saveLogs(logs) {
  const trimmedLogs = logs.slice(-MAX_LOGS);
  fs.writeFileSync(LOGS_FILE, JSON.stringify(trimmedLogs, null, 2));
}

function log(message, level = 'info', data = null) {
  const now = new Date();
  const timestamp = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const levelIcon = { info: 'ℹ️', warn: '⚠️', error: '❌', success: '✅' };

  console.log(`[${timestamp}] ${levelIcon[level] || ''} ${message}`);

  const logs = loadLogs();
  const logEntry = {
    timestamp: now.toISOString(),
    timestampLocal: timestamp,
    level,
    message,
    ...(data && { data })
  };

  logs.push(logEntry);
  saveLogs(logs);

  return logEntry;
}

module.exports = { log };
