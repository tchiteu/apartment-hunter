const fs = require('fs');
const path = require('path');

function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadJSON(filePath, defaultValue = null) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.log(`Error reading ${filePath}:`, err.message);
  }
  return defaultValue;
}

function saveJSON(filePath, data) {
  ensureDirectoryExists(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = {
  ensureDirectoryExists,
  loadJSON,
  saveJSON
};
