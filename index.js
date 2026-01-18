require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const cron = require('node-cron');
const fs = require('fs');

const APTS_FILE = './apts.json';
const LOGS_FILE = './logs.json';
const MAX_LOGS = 500;

const OLX_URL = process.env.OLX_URL;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_IDS = process.env.TELEGRAM_CHAT_IDS?.split(',') || [];
const CRON_INTERVAL_HOURS = parseInt(process.env.CRON_INTERVAL_HOURS) || 1;
const LOCATION_FILTER = process.env.LOCATION_FILTER?.split(',') || [];

function validateEnv() {
  const required = ['OLX_URL', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_IDS'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error(`Variáveis de ambiente obrigatórias não definidas: ${missing.join(', ')}`);
    console.error('Copie o .env.example para .env e preencha os valores.');
    process.exit(1);
  }
}
validateEnv();

function loadApartmentsData() {
  try {
    if (fs.existsSync(APTS_FILE)) {
      return JSON.parse(fs.readFileSync(APTS_FILE, 'utf8'));
    }
  } catch (err) {
    console.log('Erro ao ler arquivo de apartamentos:', err.message);
  }
  return { lastCheckIndex: 0, apartments: [] };
}

function saveApartmentsData(data) {
  fs.writeFileSync(APTS_FILE, JSON.stringify(data, null, 2));
}

function getSeenIds(data) {
  return data.apartments.map(apt => apt.id);
}

function filterByLocation(apartments) {
  return apartments.filter(apt =>
    LOCATION_FILTER.some(location =>
      apt.location.toLowerCase().includes(location.toLowerCase())
    )
  );
}

function getNextCheckTime() {
  const now = new Date();
  const next = new Date(now.getTime() + CRON_INTERVAL_HOURS * 60 * 60 * 1000);
  return next.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function loadLogs() {
  try {
    if (fs.existsSync(LOGS_FILE)) {
      return JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
    }
  } catch (err) {
    console.log('Erro ao ler arquivo de logs:', err.message);
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

async function sendTelegramMessage(message, disablePreview = true) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  for (const chatId of TELEGRAM_CHAT_IDS) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: disablePreview
        })
      });

      if (!response.ok) {
        log(`Erro ao enviar para chat ${chatId}`, 'error', { response: await response.text() });
      }
    } catch (err) {
      log(`Erro ao enviar notificação Telegram para ${chatId}`, 'error', { error: err.message });
    }
  }
}

async function notifyNewApartment(apt) {
  const message = `🏠 *Novo Apartamento!*

📍 *Local:* ${apt.location}
💰 *Preço:* ${apt.price}
📐 *Área:* ${apt.metters ? apt.metters + ' m²' : 'Não informado'}
📝 *Título:* ${apt.title}

🔗 [Ver anúncio](${apt.link})`;

  await sendTelegramMessage(message, false);
}

async function checkNewApartments() {
  log('Iniciando verificação de apartamentos...', 'info');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080'
    ]
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    await page.goto(OLX_URL, { waitUntil: 'networkidle2' });

    await page.waitForSelector('.olx-adcard__content', { timeout: 10000 }).catch(() => {
      log('Seletor .olx-adcard__content não encontrado', 'warn');
    });

    await page.screenshot({ path: 'debug.png', fullPage: true });
    log('Screenshot salvo em debug.png', 'info');

    const apartments = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.olx-adcard__content')).map((cardElement) => {
        const title = cardElement.querySelector('.olx-adcard__title').innerText;
        const price = cardElement.querySelector('.olx-adcard__price').innerText;
        const link = cardElement.querySelector('a').href;
        const location = cardElement.querySelector('.olx-adcard__location').innerText;
        const dirtyMetters = cardElement.querySelector('.olx-adcard__details').innerText;
        const mettersMatch = dirtyMetters.match(/(\d+)\s*m²/);
        const metters = mettersMatch ? parseInt(mettersMatch[1]) : null;

        return {
          id: link,
          title,
          price,
          location,
          link,
          metters
        };
      });
    });

    log(`Total encontrado: ${apartments.length} apartamentos`, 'info', { total: apartments.length });

    const filteredApartments = filterByLocation(apartments);
    log(`Após filtro de bairros: ${filteredApartments.length} apartamentos`, 'info', { filtered: filteredApartments.length });

    const data = loadApartmentsData();
    const seenIds = getSeenIds(data);
    const newApartments = filteredApartments.filter(apt => !seenIds.includes(apt.id));

    const nextCheck = getNextCheckTime();
    const checkIndex = data.lastCheckIndex + 1;
    const checkTimestamp = new Date().toISOString();

    if (newApartments.length > 0) {
      log(`${newApartments.length} novos apartamentos encontrados!`, 'success', {
        checkIndex,
        newCount: newApartments.length,
        apartments: newApartments.map(a => ({ title: a.title, price: a.price, location: a.location }))
      });

      for (const apt of newApartments) {
        await notifyNewApartment(apt);
      }

      const newApartmentsWithMeta = newApartments.map(apt => ({
        ...apt,
        checkIndex,
        checkTimestamp
      }));

      data.lastCheckIndex = checkIndex;
      data.apartments = [...data.apartments, ...newApartmentsWithMeta];
      saveApartmentsData(data);
    } else {
      log('Nenhum apartamento novo encontrado', 'info', { checkIndex, total: apartments.length, filtered: filteredApartments.length });

      data.lastCheckIndex = checkIndex;
      saveApartmentsData(data);
    }

    log(`Verificação #${checkIndex} concluída. Próxima: ${nextCheck}`, 'success', { checkIndex, nextCheck });

  } catch (err) {
    log(`Erro durante verificação: ${err.message}`, 'error', { error: err.message, stack: err.stack });
    await sendTelegramMessage(`❌ *Erro na verificação*\n\n${err.message}`);
  } finally {
    await browser.close();
  }
}

checkNewApartments();

cron.schedule(`0 */${CRON_INTERVAL_HOURS} * * *`, checkNewApartments);
log(`Cron configurado para rodar a cada ${CRON_INTERVAL_HOURS} hora(s)`, 'info', { intervalHours: CRON_INTERVAL_HOURS });