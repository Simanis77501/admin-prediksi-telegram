/**
 * Telegram.gs – Handler Telegram Bot API
 * Telegram Prediction Admin Panel
 */

/**
 * Daftarkan webhook ke Telegram
 * @returns {Object}
 */
function setWebhook() {
  requireAdmin();
  const token = CONFIG.BOT_TOKEN;
  const webhookUrl = CONFIG.WEBHOOK_URL;
  if (!token || !webhookUrl) {
    return { success: false, message: 'BOT_TOKEN atau WEBHOOK_URL belum dikonfigurasi.' };
  }
  try {
    const url = 'https://api.telegram.org/bot' + token + '/setWebhook';
    const payload = { url: webhookUrl };
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    Logger.log('setWebhook result: ' + JSON.stringify(result));
    return { success: result.ok, message: result.description || 'Webhook berhasil didaftarkan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Terima update dari Telegram (dipanggil oleh doPost di Code.gs)
 * @param {Object} e - Event object
 */
function handleTelegramUpdate(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (!data.message) return ContentService.createTextOutput('ok');

    const chatId = data.message.chat.id;
    const text = (data.message.text || '').toLowerCase().trim();
    const username = data.message.from.username || data.message.from.first_name || 'unknown';
    const userId = data.message.from.id;

    // Simpan log request
    saveRequest(username, chatId, text);

    // Keyword mapping: keyword → kode pasaran
    const keywordMap = {
      'hk': 'HK',
      'hongkong': 'HK',
      'prediksi hk': 'HK',
      'bocoran hk': 'HK',
      'angka hk': 'HK',
      'sgp': 'SGP',
      'singapore': 'SGP',
      'prediksi sgp': 'SGP',
      'bocoran sgp': 'SGP',
      'angka sgp': 'SGP',
      'sdy': 'SDY',
      'sydney': 'SDY',
      'prediksi sdy': 'SDY',
      'bocoran sdy': 'SDY',
      'angka sdy': 'SDY'
    };

    let pasaranTarget = null;
    for (const keyword in keywordMap) {
      if (text.includes(keyword)) {
        pasaranTarget = keywordMap[keyword];
        break;
      }
    }

    if (pasaranTarget) {
      // Anti-spam cooldown 60 detik per user per pasaran
      const cacheKey = 'cooldown_' + userId + '_' + pasaranTarget;
      const cache = CacheService.getScriptCache();
      if (cache.get(cacheKey)) {
        // Masih dalam cooldown, abaikan
        return ContentService.createTextOutput('ok');
      }
      // Set cooldown 60 detik
      cache.put(cacheKey, '1', 60);
      sendPrediction(chatId, pasaranTarget);
    }

    return ContentService.createTextOutput('ok');
  } catch (err) {
    Logger.log('handleTelegramUpdate error: ' + err.message);
    return ContentService.createTextOutput('ok');
  }
}

/**
 * Ambil prediksi terbaru dari sheet dan kirim ke Telegram
 * @param {string|number} chatId
 * @param {string} pasaran - kode pasaran (HK, SGP, SDY, dll)
 */
function sendPrediction(chatId, pasaran) {
  try {
    const sheet = getSheetByName('PREDIKSI');
    const data = sheet.getDataRange().getValues();

    let latest = null;
    // Cari baris terakhir yang sesuai pasaran
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][1]).toUpperCase() === pasaran.toUpperCase()) {
        latest = data[i];
        break;
      }
    }

    if (!latest) {
      sendTelegram(chatId, '⚠️ Prediksi untuk <b>' + pasaran + '</b> belum tersedia.');
      return;
    }

    let tanggal = '-';
    try {
      if (latest[2]) {
        const dateVal = new Date(latest[2]);
        if (!isNaN(dateVal.getTime())) {
          tanggal = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), 'dd-MM-yyyy');
        }
      }
    } catch (_) { /* date parse failed, keep '-' */ }

    const message =
      '🔮 <b>PREDIKSI ' + pasaran.toUpperCase() + '</b>\n' +
      '📅 Tanggal : ' + tanggal + '\n\n' +
      '🎯 Angka  : <b>' + (latest[3] || '-') + '</b>\n' +
      '🎯 BBFS   : <b>' + (latest[4] || '-') + '</b>\n' +
      '🎯 CB     : <b>' + (latest[5] || '-') + '</b>\n' +
      '🎯 Shio   : <b>' + (latest[6] || '-') + '</b>\n\n' +
      '✅ Semoga Hoki!';

    const result = sendTelegram(chatId, message);

    // Auto pin pesan jika berhasil terkirim
    if (result && result.result && result.result.message_id) {
      pinMessage(chatId, result.result.message_id);
    }
  } catch (err) {
    Logger.log('sendPrediction error: ' + err.message);
  }
}

/**
 * Kirim pesan ke Telegram
 * @param {string|number} chatId
 * @param {string} text - Teks dengan format HTML
 * @returns {Object|null} response JSON dari Telegram
 */
function sendTelegram(chatId, text) {
  try {
    const url = 'https://api.telegram.org/bot' + CONFIG.BOT_TOKEN + '/sendMessage';
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    };
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    const response = UrlFetchApp.fetch(url, options);
    return JSON.parse(response.getContentText());
  } catch (err) {
    Logger.log('sendTelegram error: ' + err.message);
    return null;
  }
}

/**
 * Pin pesan di group/channel Telegram
 * @param {string|number} chatId
 * @param {number} messageId
 */
function pinMessage(chatId, messageId) {
  try {
    const url = 'https://api.telegram.org/bot' + CONFIG.BOT_TOKEN + '/pinChatMessage';
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      disable_notification: true
    };
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    UrlFetchApp.fetch(url, options);
  } catch (err) {
    Logger.log('pinMessage error: ' + err.message);
  }
}
