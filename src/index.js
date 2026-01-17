const cron = require('node-cron');
const { config, validateEnv } = require('./config/env');
const { log } = require('./services/logger');
const { checkNewApartments } = require('./services/scraper');

validateEnv();
checkNewApartments();

const cronExpression = `0 */${config.cron.intervalHours} * * *`;
cron.schedule(cronExpression, checkNewApartments);

log(`Cron scheduled to run every ${config.cron.intervalHours} hour(s)`, 'info', {
  intervalHours: config.cron.intervalHours
});
