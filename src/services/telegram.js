const { config } = require('../config/env');
const { log } = require('./logger');

const { botToken, chatIds } = config.telegram;

async function sendMessage(message, disablePreview = true) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  for (const chatId of chatIds) {
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
        log(`Error sending to chat ${chatId}`, 'error', { response: await response.text() });
      }
    } catch (err) {
      log(`Error sending Telegram notification to ${chatId}`, 'error', { error: err.message });
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

  await sendMessage(message, false);
}

async function notifySummary(checkIndex, total, filtered, newCount, nextCheck) {
  const message = `✅ *Verificação #${checkIndex} concluída*

🔍 Total encontrado: ${total}
📍 Nos bairros filtrados: ${filtered}
🆕 Novos: ${newCount}

⏰ Próxima verificação: ${nextCheck}`;

  await sendMessage(message);
}

async function notifyError(errorMessage) {
  await sendMessage(`❌ *Erro na verificação*\n\n${errorMessage}`);
}

module.exports = {
  sendMessage,
  notifyNewApartment,
  notifySummary,
  notifyError
};
