/**
 * Code.gs – Backend utama Google Apps Script
 * Telegram Prediction Admin Panel
 */

// CONFIG menggunakan PropertiesService agar credential tidak hardcode
const CONFIG = {
  get BOT_TOKEN() {
    return PropertiesService.getScriptProperties().getProperty('BOT_TOKEN') || '';
  },
  get WEBHOOK_URL() {
    return PropertiesService.getScriptProperties().getProperty('WEBHOOK_URL') || '';
  },
  get SHEET_ID() {
    return PropertiesService.getScriptProperties().getProperty('SHEET_ID') || '';
  }
};

/**
 * Serve Web App HTML
 * @param {Object} e - Event object
 * @returns {HtmlOutput}
 */
function doGet(e) {
  requireAdmin();
  const page = (e && e.parameter && e.parameter.page) ? e.parameter.page : 'index';
  const template = HtmlService.createTemplateFromFile(page === 'index' ? 'index' : page);
  const html = template.evaluate()
    .setTitle('Prediction Admin Panel')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  return html;
}

/**
 * Delegasikan POST request ke Telegram.gs
 * @param {Object} e - Event object dari Telegram webhook
 */
function doPost(e) {
  return handleTelegramUpdate(e);
}

/**
 * Menyertakan file HTML lain ke dalam template
 * @param {string} filename
 * @returns {string}
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ─── PREDIKSI ────────────────────────────────────────────────────────────────

/**
 * Simpan prediksi baru ke sheet PREDIKSI
 * @param {Object} data - { pasaran, angka, bbfs, cb, shio, gambar }
 * @returns {Object} hasil operasi
 */
function insertPrediction(data) {
  requireAdmin();
  try {
    const sheet = getSheetByName('PREDIKSI');
    sheet.appendRow([
      Utilities.getUuid(),
      data.pasaran,
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
      data.angka || '',
      data.bbfs || '',
      data.cb || '',
      data.shio || '',
      data.gambar || ''
    ]);
    return { success: true, message: 'Prediksi berhasil disimpan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Ambil semua data prediksi
 * @returns {Array}
 */
function getPrediksi() {
  requireAdmin();
  const sheet = getSheetByName('PREDIKSI');
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

// ─── GROUPS ──────────────────────────────────────────────────────────────────

/**
 * Ambil semua data group
 * @returns {Array}
 */
function getGroups() {
  requireAdmin();
  const sheet = getSheetByName('GROUPS');
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

/**
 * Tambah group baru
 * @param {Object} data - { group_name, chat_id, pasaran, status }
 * @returns {Object}
 */
function insertGroup(data) {
  requireAdmin();
  try {
    const sheet = getSheetByName('GROUPS');
    sheet.appendRow([
      Utilities.getUuid(),
      data.group_name,
      data.chat_id,
      data.pasaran,
      data.status || 'ACTIVE'
    ]);
    return { success: true, message: 'Group berhasil ditambahkan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Update status group (ACTIVE / INACTIVE)
 * @param {string} id
 * @param {string} status
 * @returns {Object}
 */
function updateGroupStatus(id, status) {
  requireAdmin();
  try {
    const sheet = getSheetByName('GROUPS');
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(id)) {
        sheet.getRange(i + 1, 5).setValue(status);
        return { success: true, message: 'Status group diperbarui.' };
      }
    }
    return { success: false, message: 'Group tidak ditemukan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Hapus group berdasarkan id
 * @param {string} id
 * @returns {Object}
 */
function deleteGroup(id) {
  requireAdmin();
  try {
    const sheet = getSheetByName('GROUPS');
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Group berhasil dihapus.' };
      }
    }
    return { success: false, message: 'Group tidak ditemukan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// ─── PASARAN ─────────────────────────────────────────────────────────────────

/**
 * Ambil semua data pasaran
 * @returns {Array}
 */
function getPasaran() {
  requireAdmin();
  const sheet = getSheetByName('PASARAN');
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

/**
 * Tambah pasaran baru
 * @param {Object} data - { kode, nama, jam_post, status }
 * @returns {Object}
 */
function insertPasaran(data) {
  requireAdmin();
  try {
    const sheet = getSheetByName('PASARAN');
    sheet.appendRow([
      Utilities.getUuid(),
      data.kode,
      data.nama,
      data.jam_post,
      data.status || 'ACTIVE'
    ]);
    return { success: true, message: 'Pasaran berhasil ditambahkan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Update data pasaran
 * @param {Object} data - { id, kode, nama, jam_post, status }
 * @returns {Object}
 */
function updatePasaran(data) {
  requireAdmin();
  try {
    const sheet = getSheetByName('PASARAN');
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(data.id)) {
        sheet.getRange(i + 1, 2, 1, 4).setValues([[
          data.kode, data.nama, data.jam_post, data.status
        ]]);
        return { success: true, message: 'Pasaran berhasil diperbarui.' };
      }
    }
    return { success: false, message: 'Pasaran tidak ditemukan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// ─── REQUEST LOG ─────────────────────────────────────────────────────────────

/**
 * Ambil semua request log
 * @returns {Array}
 */
function getRequestLog() {
  requireAdmin();
  const sheet = getSheetByName('REQUEST_LOG');
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const headers = rows[0];
  return rows.slice(1).reverse().map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────

/**
 * Hitung statistik dashboard
 * @returns {Object}
 */
function getDashboardStats() {
  requireAdmin();
  try {
    const groupSheet = getSheetByName('GROUPS');
    const pasaranSheet = getSheetByName('PASARAN');
    const logSheet = getSheetByName('REQUEST_LOG');

    const groups = groupSheet.getDataRange().getValues();
    const pasaranRows = pasaranSheet.getDataRange().getValues();
    const logRows = logSheet.getDataRange().getValues();

    const totalGroup = Math.max(0, groups.length - 1);

    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    let totalRequestHariIni = 0;
    for (let i = 1; i < logRows.length; i++) {
      const waktu = logRows[i][0];
      if (waktu) {
        const tanggal = Utilities.formatDate(new Date(waktu), Session.getScriptTimeZone(), 'yyyy-MM-dd');
        if (tanggal === today) totalRequestHariIni++;
      }
    }

    let totalPasaranAktif = 0;
    const jadwalHariIni = [];
    for (let i = 1; i < pasaranRows.length; i++) {
      if (pasaranRows[i][4] === 'ACTIVE') {
        totalPasaranAktif++;
        jadwalHariIni.push({ kode: pasaranRows[i][1], nama: pasaranRows[i][2], jam: pasaranRows[i][3] });
      }
    }

    return {
      success: true,
      totalGroup,
      totalRequestHariIni,
      totalPasaranAktif,
      jadwalHariIni
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Simpan konfigurasi ke PropertiesService
 * @param {Object} config - { BOT_TOKEN, WEBHOOK_URL, SHEET_ID }
 * @returns {Object}
 */
function saveConfig(config) {
  requireAdmin();
  try {
    const props = PropertiesService.getScriptProperties();
    if (config.BOT_TOKEN) props.setProperty('BOT_TOKEN', config.BOT_TOKEN);
    if (config.WEBHOOK_URL) props.setProperty('WEBHOOK_URL', config.WEBHOOK_URL);
    if (config.SHEET_ID) props.setProperty('SHEET_ID', config.SHEET_ID);
    return { success: true, message: 'Konfigurasi berhasil disimpan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Ambil konfigurasi saat ini (tanpa nilai sensitif BOT_TOKEN)
 * @returns {Object}
 */
function getConfig() {
  requireAdmin();
  const props = PropertiesService.getScriptProperties();
  return {
    BOT_TOKEN: props.getProperty('BOT_TOKEN') ? '••••••••' : '',
    WEBHOOK_URL: props.getProperty('WEBHOOK_URL') || '',
    SHEET_ID: props.getProperty('SHEET_ID') || ''
  };
}
