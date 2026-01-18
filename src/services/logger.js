const { config } = require('../config/env');
const { loadJSON, saveJSON } = require('../utils/fs');

const LOGS_FILE = config.paths.logs;
const MAX_LOGS = config.logs.maxEntries;

function loadLogs() {
  return loadJSON(LOGS_FILE, []);
}

function saveLogs(logs) {
  const trimmedLogs = logs.slice(-MAX_LOGS);
  saveJSON(LOGS_FILE, trimmedLogs);
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
