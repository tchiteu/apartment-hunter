require('dotenv').config();

const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatIds: process.env.TELEGRAM_CHAT_IDS?.split(',') || []
  },
  olx: {
    url: process.env.OLX_URL,
    locationFilter: process.env.LOCATION_FILTER?.split(',') || []
  },
  cron: {
    intervalHours: parseInt(process.env.CRON_INTERVAL_HOURS) || 1
  },
  paths: {
    apartments: './data/apartments.json',
    logs: './data/logs.json'
  },
  logs: {
    maxEntries: 500
  }
};

function validateEnv() {
  const required = ['OLX_URL', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_IDS'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}

module.exports = { config, validateEnv };
