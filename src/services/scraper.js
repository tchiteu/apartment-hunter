const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const { config } = require('../config/env');
const { log } = require('./logger');
const telegram = require('./telegram');
const apartments = require('../storage/apartments');

function getNextCheckTime() {
  const now = new Date();
  const next = new Date(now.getTime() + config.cron.intervalHours * 60 * 60 * 1000);
  return next.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

async function scrapeOLX(page) {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll('.olx-adcard__content')).map(card => {
      const title = card.querySelector('.olx-adcard__title')?.innerText || '';
      const price = card.querySelector('.olx-adcard__price')?.innerText || '';
      const link = card.querySelector('a')?.href || '';
      const location = card.querySelector('.olx-adcard__location')?.innerText || '';
      const details = card.querySelector('.olx-adcard__details')?.innerText || '';
      const mettersMatch = details.match(/(\d+)\s*m²/);
      const metters = mettersMatch ? parseInt(mettersMatch[1]) : null;

      return { id: link, title, price, location, link, metters };
    });
  });
}

async function checkNewApartments() {
  log('Starting apartment check...', 'info');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--single-process',
      '--no-zygote',
      '--window-size=1920,1080'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  try {
    await page.goto(config.olx.url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('.olx-adcard__content', { timeout: 10000 }).catch(() => {
      log('Selector .olx-adcard__content not found', 'warn');
    });

    await page.screenshot({ path: 'debug.png', fullPage: true });

    const allApartments = await scrapeOLX(page);
    log(`Found ${allApartments.length} apartments`, 'info', { total: allApartments.length });

    const filteredApartments = apartments.filterByLocation(allApartments);
    log(`After location filter: ${filteredApartments.length}`, 'info', { filtered: filteredApartments.length });

    const data = apartments.load();
    const seenIds = apartments.getSeenIds(data);
    const newApartments = filteredApartments.filter(apt => !seenIds.includes(apt.id));

    const nextCheck = getNextCheckTime();
    const checkIndex = data.lastCheckIndex + 1;

    if (newApartments.length > 0) {
      log(`${newApartments.length} new apartments found!`, 'success', {
        checkIndex,
        newCount: newApartments.length,
        apartments: newApartments.map(a => ({ title: a.title, price: a.price, location: a.location }))
      });

      for (const apt of newApartments) {
        await telegram.notifyNewApartment(apt);
      }

      apartments.addNewApartments(data, newApartments, checkIndex);
    } else {
      log('No new apartments found', 'info', {
        checkIndex,
        total: allApartments.length,
        filtered: filteredApartments.length
      });
      apartments.updateCheckIndex(data, checkIndex);
    }

    await telegram.notifySummary(
      checkIndex,
      allApartments.length,
      filteredApartments.length,
      newApartments.length,
      nextCheck
    );

    log(`Check #${checkIndex} completed. Next: ${nextCheck}`, 'success', { checkIndex, nextCheck });
  } catch (err) {
    log(`Error during check: ${err.message}`, 'error', { error: err.message, stack: err.stack });
    await telegram.notifyError(err.message);
  } finally {
    await browser.close();
  }
}

module.exports = { checkNewApartments, getNextCheckTime };
