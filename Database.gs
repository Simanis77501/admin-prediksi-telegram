/**
 * Database.gs – Fungsi helper database Google Spreadsheet
 * Telegram Prediction Admin Panel
 */

/**
 * Helper: buka sheet berdasarkan nama
 * @param {string} name - Nama sheet
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getSheetByName(name) {
  const sheetId = CONFIG.SHEET_ID;
  if (!sheetId) throw new Error('SHEET_ID belum dikonfigurasi.');
  const ss = SpreadsheetApp.openById(sheetId);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    // Buat sheet baru jika belum ada
    sheet = ss.insertSheet(name);
    _addSheetHeaders(sheet, name);
  }
  return sheet;
}

/**
 * Tambahkan header kolom sesuai nama sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string} name
 */
function _addSheetHeaders(sheet, name) {
  const headersMap = {
    GROUPS: ['id', 'group_name', 'chat_id', 'pasaran', 'status'],
    PASARAN: ['id', 'kode', 'nama', 'jam_post', 'status'],
    PREDIKSI: ['id', 'pasaran', 'tanggal', 'angka', 'bbfs', 'cb', 'shio', 'gambar'],
    REQUEST_LOG: ['waktu', 'user', 'group', 'request']
  };
  const headers = headersMap[name];
  if (headers) {
    sheet.appendRow(headers);
    // Format header baris pertama
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4a4a4a');
    headerRange.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
}

/**
 * Inisialisasi semua sheet yang dibutuhkan
 * Dipanggil saat setup awal atau dari panel Setting
 * @returns {Object}
 */
function initSheets() {
  requireAdmin();
  try {
    const sheetId = CONFIG.SHEET_ID;
    if (!sheetId) return { success: false, message: 'SHEET_ID belum dikonfigurasi.' };

    const ss = SpreadsheetApp.openById(sheetId);
    const sheetsToCreate = ['GROUPS', 'PASARAN', 'PREDIKSI', 'REQUEST_LOG'];

    sheetsToCreate.forEach(name => {
      let sheet = ss.getSheetByName(name);
      if (!sheet) {
        sheet = ss.insertSheet(name);
        _addSheetHeaders(sheet, name);
        Logger.log('Sheet dibuat: ' + name);
      } else {
        // Pastikan header ada
        const firstRow = sheet.getRange(1, 1).getValue();
        if (!firstRow) {
          _addSheetHeaders(sheet, name);
        }
        Logger.log('Sheet sudah ada: ' + name);
      }
    });

    return { success: true, message: 'Semua sheet berhasil diinisialisasi.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Simpan log request dari anggota Telegram
 * @param {string} username - Username Telegram
 * @param {string|number} groupId - Chat ID group
 * @param {string} request - Teks request yang dikirim
 */
function saveRequest(username, groupId, request) {
  try {
    const sheet = getSheetByName('REQUEST_LOG');
    sheet.appendRow([
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
      username,
      groupId,
      request
    ]);
  } catch (err) {
    Logger.log('saveRequest error: ' + err.message);
  }
}
