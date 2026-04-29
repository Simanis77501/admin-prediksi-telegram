/**
 * Auth.gs – Autentikasi dan manajemen admin
 * Telegram Prediction Admin Panel
 */

/**
 * Ambil daftar email admin dari PropertiesService
 * @returns {string[]}
 */
function getAdminWhitelist() {
  const raw = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAILS') || '';
  return raw.split(',').map(e => e.trim().toLowerCase()).filter(e => e.length > 0);
}

/**
 * Cek apakah user yang sedang login adalah admin
 * @returns {boolean}
 */
function isAdmin() {
  try {
    const email = Session.getActiveUser().getEmail().toLowerCase();
    if (!email) return false;
    const whitelist = getAdminWhitelist();
    // Jika whitelist kosong, izinkan semua (setup awal)
    if (whitelist.length === 0) return true;
    return whitelist.includes(email);
  } catch (_) {
    return false;
  }
}

/**
 * Lempar error jika user bukan admin
 * @throws {Error}
 */
function requireAdmin() {
  if (!isAdmin()) {
    throw new Error('Akses ditolak: Anda tidak memiliki hak admin.');
  }
}

/**
 * Simpan daftar email admin ke PropertiesService
 * @param {string} emails - Email dipisah koma
 * @returns {Object}
 */
function setAdminEmails(emails) {
  requireAdmin();
  try {
    PropertiesService.getScriptProperties().setProperty('ADMIN_EMAILS', emails);
    return { success: true, message: 'Daftar admin berhasil diperbarui.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Ambil email user yang sedang aktif
 * @returns {string}
 */
function getCurrentUserEmail() {
  try {
    return Session.getActiveUser().getEmail();
  } catch (_) {
    return '';
  }
}

/**
 * Ambil daftar admin (untuk ditampilkan di setting)
 * @returns {Object}
 */
function getAdminList() {
  requireAdmin();
  return {
    success: true,
    emails: getAdminWhitelist(),
    currentUser: getCurrentUserEmail()
  };
}
