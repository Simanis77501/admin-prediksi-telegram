/**
 * Scheduler.gs – Auto posting terjadwal ke Telegram
 * Telegram Prediction Admin Panel
 */

/**
 * Auto post prediksi ke semua group aktif sesuai jam posting pasaran
 * Dipanggil oleh time-driven trigger setiap 15 menit
 */
function autoPostPredictions() {
  try {
    const groupSheet = getSheetByName('GROUPS');
    const pasaranSheet = getSheetByName('PASARAN');

    const groups = groupSheet.getDataRange().getValues();
    const pasaranRows = pasaranSheet.getDataRange().getValues();

    // Jam saat ini dalam format HH:mm
    const now = new Date();
    const jamSekarang = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm');

    // Bangun map pasaran: kode → jam_post
    const pasaranJam = {};
    for (let i = 1; i < pasaranRows.length; i++) {
      const kode = String(pasaranRows[i][1]).toUpperCase();
      const jamPost = String(pasaranRows[i][3]);
      const status = String(pasaranRows[i][4]).toUpperCase();
      if (status === 'ACTIVE') {
        pasaranJam[kode] = jamPost;
      }
    }

    // Iterasi setiap group aktif
    for (let i = 1; i < groups.length; i++) {
      const chatId = groups[i][2];
      const pasaranStr = String(groups[i][3]); // bisa multi-pasaran: "HK,SGP"
      const status = String(groups[i][4]).toUpperCase();

      if (status !== 'ACTIVE' || !chatId) continue;

      // Support multi-pasaran per group (dipisah koma)
      const pasaranList = pasaranStr.split(',').map(p => p.trim().toUpperCase());

      pasaranList.forEach(pasaran => {
        if (!pasaranJam[pasaran]) return;

        // Cek apakah jam sekarang cocok dengan jam posting pasaran (toleransi ±7 menit)
        if (_isTimeMatch(jamSekarang, pasaranJam[pasaran])) {
          // Deduplication: cegah posting ganda dalam window 10 menit
          const dedupKey = 'posted_' + chatId + '_' + pasaran + '_' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMddHHmm').slice(0, 11);
          const cache = CacheService.getScriptCache();
          if (cache.get(dedupKey)) {
            Logger.log('Skip duplicate post: ' + pasaran + ' ke chatId ' + chatId);
            return;
          }
          cache.put(dedupKey, '1', 600); // Lock selama 10 menit
          Logger.log('Posting ' + pasaran + ' ke chatId ' + chatId);
          sendPrediction(chatId, pasaran);
        }
      });
    }
  } catch (err) {
    Logger.log('autoPostPredictions error: ' + err.message);
  }
}

/**
 * Cek apakah jam sekarang cocok dengan jam target (toleransi 7 menit)
 * @param {string} jamSekarang - Format HH:mm
 * @param {string} jamTarget - Format HH:mm
 * @returns {boolean}
 */
function _isTimeMatch(jamSekarang, jamTarget) {
  try {
    const [h1, m1] = jamSekarang.split(':').map(Number);
    const [h2, m2] = jamTarget.split(':').map(Number);
    const menit1 = h1 * 60 + m1;
    const menit2 = h2 * 60 + m2;
    return Math.abs(menit1 - menit2) <= 7;
  } catch (_) {
    return false;
  }
}

/**
 * Buat time-driven trigger setiap 15 menit untuk autoPostPredictions
 * @returns {Object}
 */
function createTrigger() {
  requireAdmin();
  try {
    // Hapus trigger lama jika ada
    deleteTrigger();

    ScriptApp.newTrigger('autoPostPredictions')
      .timeBased()
      .everyMinutes(15)
      .create();

    return { success: true, message: 'Trigger berhasil dibuat (setiap 15 menit).' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Hapus semua trigger yang ada
 * @returns {Object}
 */
function deleteTrigger() {
  requireAdmin();
  try {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
    return { success: true, message: 'Semua trigger berhasil dihapus.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}
