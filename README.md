# Google Apps Script – Telegram Prediction Admin Panel

Panel admin profesional berbasis **Google Apps Script** + **Telegram Bot API** untuk:

- 📊 Dashboard statistik real-time
- 👥 Manajemen multi-group Telegram
- 🎯 Input prediksi per pasaran
- 🤖 Auto-reply request anggota
- ⏰ Auto-posting terjadwal
- 🔐 Autentikasi admin berbasis email

---

## Struktur File

```
/
├── Code.gs          # Backend utama (CRUD, doGet, doPost, stats)
├── Telegram.gs      # Webhook Telegram + auto-reply + anti-spam
├── Database.gs      # Helper sheet + initSheets + saveRequest
├── Scheduler.gs     # autoPostPredictions + trigger management
├── Auth.gs          # Whitelist admin email (PropertiesService)
├── index.html       # SPA utama (Bootstrap 5 dark theme)
├── dashboard.html   # Statistik, chart ApexCharts, jadwal
├── groups.html      # Manajemen group Telegram
├── prediction.html  # Form input prediksi
├── setting.html     # Konfigurasi bot, pasaran, admin
├── style.html       # CSS custom dark theme
├── script.html      # JavaScript frontend SPA
└── README.md
```

---

## Prasyarat

1. Akun **Google** (Google Drive + Google Apps Script)
2. **Telegram Bot** (dibuat via [@BotFather](https://t.me/BotFather))
3. **Google Spreadsheet** kosong sebagai database

---

## Langkah Setup

### 1. Buat Google Spreadsheet

1. Buka [Google Sheets](https://sheets.google.com) → buat spreadsheet baru
2. Salin **Spreadsheet ID** dari URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_DISINI/edit
   ```

### 2. Buat Google Apps Script Project

1. Buka [script.google.com](https://script.google.com)
2. Klik **New project**
3. Salin semua file `.gs` dan `.html` ke project (sesuaikan nama file)
4. Pastikan runtime V8 aktif: **Settings → Enable Chrome V8 runtime**

### 3. Simpan Konfigurasi di PropertiesService

Di Apps Script Editor, jalankan fungsi `saveConfig` sekali melalui editor, atau gunakan panel **Setting** setelah deploy:

```javascript
// Jalankan sekali di editor untuk setup awal
function setupInitial() {
  PropertiesService.getScriptProperties().setProperties({
    BOT_TOKEN: 'ISI_BOT_TOKEN_DARI_BOTFATHER',
    SHEET_ID:  'ISI_SPREADSHEET_ID',
    WEBHOOK_URL: '' // Diisi setelah deploy
  });
}
```

> ⚠️ **JANGAN** hardcode token di source code. Selalu gunakan `PropertiesService`.

### 4. Inisialisasi Sheet

Jalankan `initSheets()` dari editor atau klik tombol **Init Sheets** di panel Setting.

Ini akan membuat 4 sheet otomatis:
| Sheet | Kolom |
|-------|-------|
| `GROUPS` | id, group_name, chat_id, pasaran, status |
| `PASARAN` | id, kode, nama, jam_post, status |
| `PREDIKSI` | id, pasaran, tanggal, angka, bbfs, cb, shio, gambar |
| `REQUEST_LOG` | waktu, user, group, request |

### 5. Deploy Web App

1. Klik **Deploy → New deployment**
2. Pilih type: **Web app**
3. Isi konfigurasi:
   - **Execute as**: Me
   - **Who has access**: Anyone (atau Anyone with Google account)
4. Klik **Deploy**
5. Salin **Web App URL** yang diberikan

### 6. Set Webhook Telegram

1. Buka panel Setting di Web App
2. Masukkan **Web App URL** di field WEBHOOK_URL
3. Simpan config
4. Klik tombol **Set Webhook**

Atau jalankan via editor:
```javascript
function setupWebhook() {
  PropertiesService.getScriptProperties().setProperty('WEBHOOK_URL', 'https://script.google.com/macros/s/...');
  setWebhook();
}
```

Verifikasi: buka URL berikut di browser:
```
https://api.telegram.org/botTOKEN_KAMU/getWebhookInfo
```

### 7. Tambahkan Bot ke Group Telegram

1. Tambahkan bot ke group Telegram sebagai **admin**
2. Bot harus memiliki permission: **Kirim pesan** + **Pin pesan**
3. Ambil Chat ID group:
   - Kirim pesan ke group
   - Buka: `https://api.telegram.org/botTOKEN/getUpdates`
   - Cari field `chat.id` (biasanya negatif, contoh: `-1001234567890`)

### 8. Setup Trigger Auto-Posting

1. Buka panel Setting → klik **Buat Trigger**
2. Atau jalankan `createTrigger()` dari editor

Trigger berjalan setiap **15 menit** dan mengirim prediksi ke group yang jam posting pasarannya cocok (toleransi ±7 menit).

### 9. Setup Admin Whitelist (Opsional tapi Disarankan)

Di panel Setting → masukkan email admin (pisah koma):
```
admin@gmail.com, admin2@gmail.com
```

Jika whitelist kosong, semua user Google yang bisa akses URL dapat login.

---

## Penggunaan Panel Admin

### Dashboard
- Statistik total group, request hari ini, pasaran aktif
- Chart request per pasaran
- Jadwal posting hari ini
- 5 request terbaru

### Manajemen Group
- Tambah/hapus group Telegram
- Toggle status ACTIVE/INACTIVE
- Multi-pasaran per group (pisah koma: `HK,SGP`)

### Input Prediksi
- Pilih pasaran → isi angka, BBFS, CB, shio, gambar
- Preview format sebelum simpan
- Lihat 10 prediksi terbaru per pasaran

### Pengaturan
- Konfigurasi BOT_TOKEN, WEBHOOK_URL, SHEET_ID
- Set webhook
- Buat/hapus trigger
- Tambah/edit pasaran dengan jam posting
- Kelola whitelist admin

---

## Auto-Reply Keyword

Bot akan merespons pesan anggota yang mengandung keyword berikut:

| Keyword | Pasaran |
|---------|---------|
| `hk`, `hongkong`, `prediksi hk`, `bocoran hk`, `angka hk` | HK |
| `sgp`, `singapore`, `prediksi sgp`, `bocoran sgp`, `angka sgp` | SGP |
| `sdy`, `sydney`, `prediksi sdy`, `bocoran sdy`, `angka sdy` | SDY |

**Anti-spam**: Cooldown 60 detik per user per pasaran (via `CacheService`).

---

## Keamanan

- ✅ Token & credential disimpan di `PropertiesService` (tidak hardcode)
- ✅ Whitelist admin berbasis email Google
- ✅ Anti-spam cooldown via `CacheService`
- ✅ `requireAdmin()` di setiap fungsi server
- ✅ BOT_TOKEN tidak pernah dikirim ke frontend

---

## Teknologi

| Layer | Stack |
|-------|-------|
| Backend | Google Apps Script (V8 Runtime) |
| Database | Google Spreadsheet |
| Bot API | Telegram Bot API |
| Frontend | Bootstrap 5, ApexCharts, SweetAlert2, DataTables |
| Auth | Google Session + PropertiesService |

---

## Troubleshooting

**Webhook tidak aktif?**
- Pastikan Web App di-deploy dengan akses "Anyone"
- Verifikasi token benar via BotFather
- Cek: `https://api.telegram.org/botTOKEN/getWebhookInfo`

**Sheet tidak ditemukan?**
- Pastikan SHEET_ID benar di Properties
- Jalankan `initSheets()` dari editor

**Bot tidak membalas?**
- Pastikan bot sudah jadi admin di group
- Cek `Execution Log` di Apps Script editor
- Pastikan webhook sudah terdaftar

**Auto-posting tidak berjalan?**
- Pastikan trigger sudah dibuat (`createTrigger()`)
- Cek jam posting pasaran sesuai timezone
- Timezone default: `Session.getScriptTimeZone()`

---

## Lisensi

MIT License – Bebas digunakan dan dimodifikasi.
