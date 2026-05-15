# COMPLIANCE.md
# MasjidLink — Kepatuhan Syariah & Regulasi

**Versi:** 1.0.0 | **Tanggal:** Mei 2026 | **Penyusun:** Tim Syariah & Legal MasjidLink

---

## Daftar Isi

1. [Gambaran Umum Kepatuhan](#1-gambaran-umum-kepatuhan)
2. [Kepatuhan Akuntansi Syariah — PSAK 109](#2-kepatuhan-akuntansi-syariah--psak-109)
3. [Kepatuhan Fatwa DSN-MUI](#3-kepatuhan-fatwa-dsn-mui)
4. [Kepatuhan Regulasi Pengelolaan Zakat](#4-kepatuhan-regulasi-pengelolaan-zakat)
5. [Kepatuhan Perlindungan Data Pribadi (UU PDP)](#5-kepatuhan-perlindungan-data-pribadi-uu-pdp)
6. [Kepatuhan Layanan Keuangan Digital](#6-kepatuhan-layanan-keuangan-digital)
7. [Pemisahan Dana ZISWAF](#7-pemisahan-dana-ziswaf)
8. [Laporan Keuangan Syariah Otomatis](#8-laporan-keuangan-syariah-otomatis)
9. [Audit & Pengawasan Syariah](#9-audit--pengawasan-syariah)
10. [Matriks Kepatuhan](#10-matriks-kepatuhan)

---

## 1. Gambaran Umum Kepatuhan

MasjidLink beroperasi dalam dua domain kepatuhan utama:

### 1.1 Kepatuhan Syariah
Seluruh fitur pengelolaan keuangan masjid dirancang sesuai prinsip-prinsip Islam, merujuk pada:
- **PSAK 109** — Standar Akuntansi Keuangan Zakat dan Infaq/Sedekah (IAI)
- **Fatwa DSN-MUI** — Berbagai fatwa relevan terkait keuangan Islam
- **UU No. 23 Tahun 2011** — Undang-Undang Pengelolaan Zakat
- **PP No. 14 Tahun 2014** — Peraturan Pelaksanaan UU Zakat

### 1.2 Kepatuhan Regulasi
Platform ini mematuhi regulasi negara yang berlaku:
- **UU No. 27 Tahun 2022** — Undang-Undang Perlindungan Data Pribadi (UU PDP)
- **POJK terkait Fintech** — Regulasi OJK untuk layanan keuangan digital
- **Regulasi BAZNAS** — Standar pelaporan lembaga amil zakat

---

## 2. Kepatuhan Akuntansi Syariah — PSAK 109

### 2.1 Latar Belakang PSAK 109

PSAK 109 diterbitkan oleh Ikatan Akuntan Indonesia (IAI) dan berlaku bagi **Amil** yang menerima dan menyalurkan dana zakat, infaq, dan sedekah. Masjid yang memiliki DKM dan menerima dana ZISWAF dari jamaah/donatur berperan sebagai **Amil**.

### 2.2 Komponen Laporan Keuangan yang Diimplementasikan

MasjidLink menghasilkan semua komponen laporan keuangan sesuai PSAK 109:

#### A. Laporan Posisi Keuangan (Neraca Syariah)

```
ASET
  Aset Lancar
    - Kas dan setara kas              Rp xxx
    - Dana ZISWAF tersimpan           Rp xxx
    - Piutang program                 Rp xxx
  
  Aset Tidak Lancar
    - Aset wakaf dikelola             Rp xxx
  
  Total Aset                          Rp xxx

KEWAJIBAN & SALDO DANA
  Kewajiban Jangka Pendek
    - Dana titipan mustahiq           Rp xxx
  
  Saldo Dana
    - Dana Zakat                      Rp xxx
    - Dana Infaq/Sedekah              Rp xxx
    - Dana Amil                       Rp xxx
    - Dana Wakaf                      Rp xxx
  
  Total Kewajiban & Saldo Dana        Rp xxx
```

#### B. Laporan Perubahan Dana

```
DANA ZAKAT
  Penerimaan Zakat
    - Zakat Maal                      Rp xxx
    - Zakat Fitrah                    Rp xxx
  
  Penyaluran Zakat (8 Asnaf)
    - Fakir                           Rp xxx
    - Miskin                          Rp xxx
    - Amil                            Rp xxx
    - Mualaf                          Rp xxx
    - Riqab                           Rp xxx
    - Gharimin                        Rp xxx
    - Fi Sabilillah                   Rp xxx
    - Ibnu Sabil                      Rp xxx
  
  Kenaikan/Penurunan Dana Zakat       Rp xxx

DANA INFAQ/SEDEKAH
  Penerimaan Infaq/Sedekah
    - Infaq terikat (Muqayyad)        Rp xxx
    - Infaq tidak terikat (Muthlaqa)  Rp xxx
  
  Penyaluran Infaq/Sedekah
    - Program sosial                  Rp xxx
    - Program pendidikan              Rp xxx
    - Operasional masjid              Rp xxx
  
  Kenaikan/Penurunan Dana I/S         Rp xxx

DANA AMIL
  Penerimaan Bagian Amil              Rp xxx
  Penggunaan Dana Amil                Rp xxx
  Kenaikan/Penurunan Dana Amil        Rp xxx
```

#### C. Laporan Arus Kas

Format standar (aktivitas operasi, investasi, pendanaan) yang disesuaikan dengan karakteristik dana ZISWAF.

#### D. Catatan atas Laporan Keuangan (CaLK)

Otomatis dihasilkan sistem meliputi:
- Kebijakan akuntansi yang digunakan
- Rincian setiap pos laporan keuangan
- Informasi penting lainnya sesuai PSAK 109

### 2.3 Implementasi Teknis PSAK 109 di Sistem

```typescript
// Contoh enum kategori dana sesuai PSAK 109
enum FundCategory {
  ZAKAT_MAAL      = 'zakat_maal',       // Zakat harta
  ZAKAT_FITRAH    = 'zakat_fitrah',     // Zakat jiwa
  INFAQ_MUQAYYAD  = 'infaq_muqayyad',  // Infaq terikat
  INFAQ_MUTHLAQA  = 'infaq_muthlaqa',  // Infaq tidak terikat
  SHODAQOH        = 'shodaqoh',         // Sedekah umum
  WAKAF_TUNAI     = 'wakaf_tunai',      // Wakaf uang
  WAKAF_ASET      = 'wakaf_aset',       // Wakaf benda
  HIBAH           = 'hibah',            // Pemberian
  DANA_AMIL       = 'dana_amil',        // Bagian amil
}

// Mapping distribusi ke 8 asnaf (khusus Zakat)
enum ZakatAsnaf {
  FAKIR        = 'fakir',
  MISKIN       = 'miskin',
  AMIL         = 'amil',
  MUALAF       = 'mualaf',
  RIQAB        = 'riqab',
  GHARIMIN     = 'gharimin',
  FI_SABILILLAH = 'fi_sabilillah',
  IBNU_SABIL   = 'ibnu_sabil',
}
```

---

## 3. Kepatuhan Fatwa DSN-MUI

### 3.1 Fatwa yang Relevan dan Implementasinya

| Fatwa DSN-MUI | Topik | Implementasi di MasjidLink |
|---------------|-------|---------------------------|
| No. 86/DSN-MUI/XII/2012 | Hadiah dalam penghimpunan dana lembaga keuangan syariah | Donasi tidak boleh dikaitkan dengan imbalan materi — sistem mencegah setting reward berupa bunga/imbal hasil finansial |
| No. 14/DSN-MUI/IX/2000 | Distribusi hasil usaha dalam akad mudharabah | Dana wakaf produktif yang menghasilkan return wajib didistribusikan sesuai nisbah yang disepakati |
| No. 106/DSN-MUI/XII/2016 | Wakaf manfaat asuransi dan manfaat investasi | Wakaf tunai dicatat terpisah, pokok tidak boleh berkurang |
| No. 001/DSN-MUI/X/2013 | Lindung nilai syariah | Tidak berlaku untuk transaksi donasi, namun menjadi referensi untuk dana investasi masjid di masa depan |

### 3.2 Prinsip Syariah yang Ditegakkan Sistem

**1. Transparansi (Amanah)**
- Semua transaksi dapat ditelusuri (audit trail lengkap)
- Laporan keuangan wajib dipublikasikan setiap bulan
- Tidak ada dana yang dapat "disembunyikan" dari sistem

**2. Pemisahan Dana (Segregation)**
- Dana zakat tidak boleh dicampur dengan infaq atau operasional
- Sistem secara teknis mencegah alokasi dana zakat ke program non-mustahiq tanpa konfirmasi DKM
- Visualisasi pemisahan dana tersedia di dashboard

**3. Hak Amil**
- Sistem menghitung hak amil (DKM) otomatis berdasarkan persentase yang dikonfigurasi
- Persentase amil dibatasi maksimal 12,5% (1/8) dari dana zakat sesuai fikih
- Selebihnya harus disalurkan kepada 8 asnaf

**4. Larangan Riba**
- Platform tidak memungut biaya administrasi dari dana ZISWAF
- Biaya layanan MasjidLink ditagihkan secara terpisah sebagai biaya platform (bukan dari dana umat)
- Dana tidak boleh "mengendap" tanpa penggunaan yang jelas — sistem mengingatkan DKM

### 3.3 Validasi Syariah di Level Kode

```typescript
// Business rule: Zakat tidak bisa dialokasikan ke program non-mustahiq
async function allocateToProgram(
  transactionId: string,
  programId: string,
  fundCategory: FundCategory
): Promise<void> {
  
  if (fundCategory === FundCategory.ZAKAT_MAAL) {
    const program = await programService.findById(programId);
    
    // Validasi: program harus untuk mustahiq
    if (!program.targetGroups.some(g => ZAKAT_ELIGIBLE_GROUPS.includes(g))) {
      throw new SyariahViolationError(
        'Dana zakat hanya dapat dialokasikan ke program yang menyasar 8 asnaf mustahiq. ' +
        'Silakan konfirmasi dengan ketua DKM atau konsultan syariah.'
      );
    }
  }
  
  // Validasi: wakaf pokok tidak boleh berkurang
  if (fundCategory === FundCategory.WAKAF_TUNAI) {
    const currentBalance = await getWakafBalance();
    const transaction = await transactionService.findById(transactionId);
    
    if (transaction.type === 'expense' && transaction.amount > currentBalance.investmentReturn) {
      throw new SyariahViolationError(
        'Pengeluaran dari dana wakaf tidak boleh melebihi hasil/keuntungan wakaf. ' +
        'Pokok wakaf bersifat abadi dan tidak boleh berkurang.'
      );
    }
  }
}
```

---

## 4. Kepatuhan Regulasi Pengelolaan Zakat

### 4.1 UU No. 23 Tahun 2011 tentang Pengelolaan Zakat

**Pasal yang relevan dan implementasinya:**

| Pasal | Ketentuan | Implementasi |
|-------|-----------|-------------|
| Pasal 6 | BAZNAS berwenang mengkoordinasi pengelolaan zakat nasional | Sistem dirancang untuk integrasi pelaporan ke BAZNAS di Fase 2 |
| Pasal 17 | LAZ wajib melaporkan pelaksanaan pengelolaan zakat kepada BAZNAS | Laporan ekspor format BAZNAS tersedia di modul keuangan |
| Pasal 22 | Zakat yang dibayarkan dapat dikurangkan dari penghasilan kena pajak | Sistem menghasilkan bukti setor zakat yang dapat digunakan untuk pengurangan pajak |
| Pasal 38 | Larangan mengumpulkan dana yang menyerupai zakat tanpa izin | Masjid pengguna wajib memastikan memiliki izin/rekomendasi pengumpulan ZIS |

### 4.2 PP No. 14 Tahun 2014

**Kewajiban LAZ/UPZ yang difasilitasi sistem:**
- Pembukuan keuangan yang tertib dan akuntabel ✅
- Pelaporan berkala (bulanan dan tahunan) ✅
- Penyampaian laporan kepada BAZNAS ✅ (ekspor format standard)
- Pengumuman laporan keuangan kepada masyarakat ✅ (halaman publik)

### 4.3 Disclaimer Penting

> **PERHATIAN:** MasjidLink adalah platform teknologi, bukan Lembaga Amil Zakat (LAZ) yang berizin. Masjid yang menggunakan MasjidLink untuk mengelola dana ZISWAF bertanggung jawab penuh atas kepatuhan hukum mereka sendiri, termasuk kebutuhan izin dari BAZNAS apabila diperlukan. MasjidLink menyediakan alat (tools) untuk membantu kepatuhan, namun tidak menggantikan kewajiban hukum masjid selaku pengelola dana.

---

## 5. Kepatuhan Perlindungan Data Pribadi (UU PDP)

### 5.1 Dasar Hukum

**UU No. 27 Tahun 2022 tentang Perlindungan Data Pribadi** berlaku sejak 17 Oktober 2024. MasjidLink berkomitmen penuh untuk mematuhi seluruh ketentuan UU PDP.

### 5.2 Prinsip Pemrosesan Data yang Diterapkan

| Prinsip UU PDP | Implementasi MasjidLink |
|----------------|------------------------|
| **Tujuan yang sah** | Data dikumpulkan hanya untuk keperluan operasional platform (manajemen akun, program, keuangan) |
| **Relevansi** | Hanya data yang benar-benar diperlukan yang dikumpulkan (data minimal) |
| **Keakuratan** | Pengguna dapat memperbarui data kapan saja melalui pengaturan akun |
| **Penyimpanan terbatas** | Data akun aktif + 2 tahun setelah deaktivasi; data keuangan 10 tahun untuk keperluan audit |
| **Keamanan** | Enkripsi AES-256, HTTPS, WAF, audit trail akses data sensitif |
| **Akuntabilitas** | Data Protection Officer (DPO) ditunjuk; kebijakan privasi transparan |

### 5.3 Hak-hak Subjek Data

MasjidLink menyediakan mekanisme bagi pengguna untuk menjalankan hak-haknya:

| Hak | Cara Menggunakan | SLA Respons |
|-----|------------------|-------------|
| Hak mengakses data | Pengaturan Akun → "Unduh Data Saya" | 3 hari kerja |
| Hak memperbaiki data | Pengaturan Akun → Edit Profil | Langsung |
| Hak menghapus data | Pengaturan Akun → "Hapus Akun" | 30 hari kerja |
| Hak membatasi pemrosesan | Pengaturan Akun → "Preferensi Data" | 3 hari kerja |
| Hak portabilitas data | Pengaturan Akun → "Ekspor Data" (JSON) | 3 hari kerja |
| Hak menolak pemrosesan | Menghubungi privacy@masjidlink.id | 14 hari kerja |

### 5.4 Data yang Dikumpulkan dan Dasar Hukumnya

| Kategori Data | Data yang Dikumpulkan | Dasar Pemrosesan |
|---------------|----------------------|------------------|
| Identitas | Nama, email, nomor HP | Kontrak (untuk akun) |
| Lokasi | Kota/kabupaten (tidak real-time) | Persetujuan (untuk pencarian masjid terdekat) |
| Keuangan | Riwayat donasi, jumlah | Kewajiban hukum (laporan keuangan) |
| Perilaku | Program yang dilihat, diklik | Kepentingan sah (meningkatkan rekomendasi AI) |
| Perangkat | Device ID, OS (untuk push notif) | Persetujuan (untuk notifikasi) |

### 5.5 Pihak Ketiga yang Menerima Data

| Vendor | Data yang Dibagikan | Tujuan | Perlindungan |
|--------|--------------------|---------|----|
| Midtrans | Nama, email, nomor transaksi | Pemrosesan pembayaran | Perjanjian pemrosesan data, PCI-DSS |
| Anthropic (Claude) | Konten chat (tanpa PII identifiable) | Layanan chatbot | Data processing agreement |
| Firebase (Google) | Device token | Push notification | Google DPA |
| WhatsApp (Meta) | Nomor HP, konten notifikasi | Notifikasi penting | Meta DPA |
| SendGrid | Nama, email | Pengiriman email | SendGrid DPA |

> **Catatan:** MasjidLink **tidak menjual** data pengguna kepada pihak ketiga manapun untuk tujuan iklan atau komersial.

---

## 6. Kepatuhan Layanan Keuangan Digital

### 6.1 Status Regulasi

MasjidLink beroperasi sebagai **platform teknologi** (tech platform) yang memfasilitasi pencatatan dan pengelolaan dana masjid, bukan sebagai:
- Lembaga Amil Zakat (LAZ) — *tidak memerlukan izin OJK*
- Payment Service Provider — *pembayaran diproses oleh Midtrans yang berizin*
- Rekening Penampung Dana — *dana donasi masuk langsung ke rekening masjid*

### 6.2 Alur Dana (Fund Flow)

```
Donatur
    │  (Transfer / QRIS / E-wallet)
    ▼
Midtrans Payment Gateway
    │  (Settlement T+1 hari kerja)
    ▼
Rekening Bank Masjid
    │  (Dikuasai penuh oleh DKM)
    ▼
Dicatat oleh MasjidLink (pencatatan saja, bukan penguasaan dana)
```

> **Penting:** MasjidLink **tidak menguasai** dana donasi. Dana mengalir langsung dari donatur ke rekening masjid melalui Midtrans. MasjidLink hanya menyediakan teknologi pencatatan dan pelaporan.

---

## 7. Pemisahan Dana ZISWAF

### 7.1 Prinsip Pemisahan

Setiap masjid di MasjidLink memiliki **virtual fund accounts** untuk setiap jenis dana. Pemisahan ini bersifat akuntansi (pembukuan), bukan rekening bank terpisah — kecuali jika DKM memilih konfigurasi multi-rekening.

### 7.2 Matriks Penggunaan Dana

| Jenis Dana | Boleh Untuk | Tidak Boleh Untuk | Catatan |
|------------|-------------|-------------------|---------|
| **Zakat Maal** | Program untuk 8 asnaf mustahiq | Infrastruktur masjid (non-asnaf), operasional amil > 12,5% | Penyaluran harus ke mustahiq teridentifikasi |
| **Zakat Fitrah** | Disalurkan ke fakir & miskin sebelum Idul Fitri | Disimpan > 1 bulan setelah Idul Fitri | Penundaan penyaluran > 1 bulan melanggar syariah |
| **Infaq Muqayyad** | Sesuai niat pemberi (wajib ditepati) | Tujuan lain tanpa izin pemberi | Jika pemberi tidak dapat dihubungi, tanyakan ke ulama |
| **Infaq Muthlaqa** | Program apapun yang mashlahat | — | Fleksibel, dikelola DKM |
| **Shodaqoh** | Program apapun yang mashlahat | — | Mirip infaq muthlaqa |
| **Wakaf Tunai** | Pokok: investasi produktif. Hasil: sesuai ikrar | Mengurangi pokok wakaf | Pokok harus tetap utuh selamanya |
| **Wakaf Aset** | Pemanfaatan sesuai ikrar wakif | Dijual, dihibahkan, dipindahtangankan | Aset wakaf bersifat abadi |
| **Hibah** | Sesuai kesepakatan | Melanggar syarat hibah | Mengikuti akad yang disepakati |

### 7.3 Implementasi Kontrol Teknis

```typescript
// Validasi alokasi dana saat input transaksi pengeluaran
const FUND_USAGE_RULES: Record<FundCategory, ProgramCategory[]> = {
  [FundCategory.ZAKAT_MAAL]: [
    ProgramCategory.BANTUAN_SOSIAL,    // Untuk fakir, miskin
    ProgramCategory.BEASISWA,          // Untuk pendidikan mustahiq
    ProgramCategory.KESEHATAN_DHUAFA,  // Untuk gharimin sakit
  ],
  [FundCategory.INFAQ_MUTHLAQA]: Object.values(ProgramCategory), // Semua program
  [FundCategory.SHODAQOH]:        Object.values(ProgramCategory), // Semua program
  [FundCategory.WAKAF_TUNAI]:     [ProgramCategory.INVESTASI_PRODUKTIF],
  // ... dst
};

function validateFundUsage(fundCategory: FundCategory, programCategory: ProgramCategory): void {
  const allowedCategories = FUND_USAGE_RULES[fundCategory];
  if (!allowedCategories.includes(programCategory)) {
    throw new SyariahViolationError(
      `Dana ${fundCategory} tidak dapat digunakan untuk program kategori ${programCategory}. ` +
      `Lihat panduan syariah di COMPLIANCE.md untuk detail.`
    );
  }
}
```

---

## 8. Laporan Keuangan Syariah Otomatis

### 8.1 Jadwal Pelaporan Otomatis

| Laporan | Frekuensi | Siapa yang Dapat Akses | Publikasi |
|---------|-----------|------------------------|-----------|
| Laporan Bulanan | Hari ke-5 bulan berikutnya | Publik (halaman masjid) | Otomatis |
| Laporan PSAK 109 Kuartalan | Hari ke-10 setelah kuartal | Pengurus + Publik | Manual oleh DKM |
| Laporan Tahunan | 31 Januari tahun berikutnya | Publik | Otomatis + perlu approval DKM |
| Laporan Program (LPJ) | Setelah program selesai | Publik | Setelah DKM submit |
| Laporan Amil | Bulanan | Pengurus (privat) | Tidak dipublikasi |

### 8.2 Validasi Sebelum Laporan Diterbitkan

Sistem melakukan pengecekan otomatis sebelum menerbitkan laporan:

```
✓ Total pemasukan per kategori = Sum(semua transaksi income bulan tersebut)
✓ Total pengeluaran per kategori = Sum(semua transaksi expense bulan tersebut)
✓ Saldo akhir = Saldo awal + Pemasukan - Pengeluaran
✓ Dana zakat tersalurkan hanya ke mustahiq yang valid
✓ Pokok wakaf tidak berkurang dari periode sebelumnya
✓ Persentase amil tidak melebihi 12,5% dari dana zakat
```

Jika validasi gagal, laporan ditahan dan pengurus diberi notifikasi dengan penjelasan detail.

---

## 9. Audit & Pengawasan Syariah

### 9.1 Audit Trail Keuangan

Setiap transaksi yang dicatat di MasjidLink memiliki:
- **Timestamp** yang tidak dapat diubah (server time, bukan client time)
- **User ID** yang melakukan pencatatan
- **Hash transaksi** — SHA-256 dari data transaksi untuk deteksi manipulasi
- **Audit log** — semua perubahan status tercatat (created, modified, reversed)

```sql
-- Struktur audit log
CREATE TABLE transaction_audit_log (
  id              UUID PRIMARY KEY,
  transaction_id  UUID NOT NULL REFERENCES transactions(id),
  action          VARCHAR(50) NOT NULL,  -- 'created', 'reversed', 'approved'
  performed_by    UUID NOT NULL REFERENCES users(id),
  performed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_data        JSONB,
  new_data        JSONB,
  ip_address      INET,
  hash            VARCHAR(64) NOT NULL  -- SHA-256 fingerprint
);
```

### 9.2 Rekomendasi Pengawasan untuk DKM

MasjidLink merekomendasikan setiap masjid untuk:

1. **Membentuk Tim Pengawas Internal** — minimal 2 orang yang independen dari bendahara untuk mereview laporan bulanan
2. **Audit Syariah Tahunan** — mengundang ustadz/konsultan syariah untuk mereview kesesuaian penggunaan dana dengan ketentuan Islam
3. **Audit Akuntan Publik** — untuk masjid yang mengelola dana > Rp 500 juta per tahun, disarankan audit oleh Kantor Akuntan Publik (KAP)

### 9.3 Laporan untuk Auditor Eksternal

MasjidLink menyediakan export data khusus untuk auditor:
- Export transaksi lengkap dalam format Excel/CSV
- Trail log semua perubahan data
- Hash verification untuk setiap transaksi
- Laporan rekonsiliasi bank (jika terintegrasi)

---

## 10. Matriks Kepatuhan

### 10.1 Status Kepatuhan Saat Ini

| Area Kepatuhan | Status | Catatan |
|----------------|--------|---------|
| **PSAK 109 — Laporan Keuangan** | ✅ Implemented | Semua 4 komponen laporan tersedia |
| **PSAK 109 — Pemisahan Dana** | ✅ Implemented | Virtual fund accounts per kategori |
| **PSAK 109 — Hak Amil** | ✅ Implemented | Kalkulator otomatis, batas 12,5% |
| **Distribusi ke 8 Asnaf** | ✅ Implemented | Kategorisasi penyaluran zakat |
| **Validasi Syariah Transaksi** | ✅ Implemented | Business rules di service layer |
| **UU Zakat — Pelaporan** | ✅ Implemented | Export format BAZNAS |
| **UU PDP — Hak Subjek Data** | ✅ Implemented | Menu pengaturan akun |
| **UU PDP — Keamanan Data** | ✅ Implemented | Enkripsi, WAF, audit log |
| **UU PDP — DPO** | 🔄 In Progress | Penunjukan DPO dalam proses |
| **Integrasi BAZNAS** | 📋 Planned (Fase 2) | API integrasi direncanakan |
| **Audit Syariah Independen** | 📋 Planned | Sebelum public launch |
| **Sertifikasi ISO 27001** | 📋 Planned (Tahun 2) | Keamanan informasi |

**Legend:** ✅ Selesai | 🔄 Sedang Berjalan | 📋 Direncanakan

### 10.2 Penanganan Pelanggaran Kepatuhan

Jika sistem mendeteksi potensi pelanggaran syariah atau regulasi:

1. **Level 1 — Warning:** Transaksi diproses tapi pengurus diberi notifikasi peringatan
2. **Level 2 — Confirmation Required:** Transaksi ditahan, butuh konfirmasi eksplisit dari Ketua DKM
3. **Level 3 — Hard Block:** Transaksi ditolak sepenuhnya, log dikirim ke admin MasjidLink

---

## Referensi Regulasi

| Dokumen | Nomor/Kode | Penerbit | Tahun |
|---------|------------|----------|-------|
| UU Pengelolaan Zakat | UU No. 23/2011 | DPR RI | 2011 |
| PP Pelaksanaan UU Zakat | PP No. 14/2014 | Pemerintah RI | 2014 |
| PSAK 109 | PSAK 109 Rev. 2021 | IAI | 2021 |
| Fatwa Hadiah Penghimpunan Dana | No. 86/DSN-MUI/XII/2012 | DSN-MUI | 2012 |
| UU Perlindungan Data Pribadi | UU No. 27/2022 | DPR RI | 2022 |

---

*Dokumen ini diperbarui setiap ada perubahan regulasi atau standar syariah yang relevan. Untuk pertanyaan kepatuhan, hubungi: compliance@masjidlink.id*

**MasjidLink** | *Amanah dalam Teknologi, Taat dalam Syariah* 🕌
