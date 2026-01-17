require('dotenv').config();

const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatIds: process.env.TELEGRAM_CHAT_IDS?.split(',') || [],
  },
  olx: {
    url: process.env.OLX_URL,
    locationFilter: process.env.LOCATION_FILTER?.split(',') || [],
  },
  cron: {
    intervalHours: parseInt(process.env.CRON_INTERVAL_HOURS) || 1,
  },
  paths: {
    apartments: './data/apartments.json',
    logs: './data/logs.json',
  },
  logs: {
    maxEntries: 500,
  },
};

function validateEnv() {
  const required = ['OLX_URL', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_IDS'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error(`Variáveis de ambiente obrigatórias não definidas: ${missing.join(', ')}`);
    console.error('Copie o .env.example para .env e preencha os valores.');
    process.exit(1);
  }
}

module.exports = { config, validateEnv };
