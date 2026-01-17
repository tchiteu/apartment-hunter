const cron = require('node-cron');
const { config, validateEnv } = require('./config/env');
const { log } = require('./services/logger');
const { checkNewApartments } = require('./services/scraper');

validateEnv();
checkNewApartments();

const cronExpression = `0 */${config.cron.intervalHours} * * *`;
cron.schedule(cronExpression, checkNewApartments);

log(`Cron configurado para rodar a cada ${config.cron.intervalHours} hora(s)`, 'info', {
  intervalHours: config.cron.intervalHours,
});
