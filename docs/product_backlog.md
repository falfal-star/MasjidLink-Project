# MasjidLink - Product Backlog

Dokumen ini berisi daftar Product Backlog untuk pengembangan **MasjidLink** berdasarkan dokumen PRD, Blueprint, dan Technical Architecture. Backlog disusun berdasarkan Epic, Fitur, dan User Story.

## Epic 1: Frontend UI Visualisasi & Auth (Supabase)
**Prioritas: Tinggi (Sprint 1)**

| ID | Tipe | Judul / User Story | Prioritas | Estimasi |
|---|---|---|---|---|
| FRONT-01 | Story | **Desain UI Final**: Sebagai user, saya melihat antarmuka (UI) yang final, modern, dan bersih untuk seluruh portal (Web & Mobile). | High | 5 |
| AUTH-01 | Story | **Registrasi Universal**: Sebagai pengguna baru, saya mendaftar dengan Google Login (via Supabase) beserta alamat. Semua *default* terdaftar sebagai **Jama'ah**. | High | 3 |
| AUTH-02 | Story | **Penetapan Pengurus**: Sebagai Super Admin, saya dapat mengatur status Jama'ah menjadi **Pengurus** untuk masjid tertentu. | High | 2 |
| AUTH-03 | Story | **Multi-Tenancy (RLS)**: Sebagai sistem, saya memastikan data tiap masjid terisolasi menggunakan Tenant ID (Row-Level Security di Supabase). | High | 3 |

## Epic 2: Manajemen Program Masjid (Program Service)
**Prioritas: Tinggi (Sprint 2)**

| ID | Tipe | Judul / User Story | Prioritas | Estimasi |
|---|---|---|---|---|
| PROG-01 | Story | **Pembuatan Proposal**: Sebagai panitia DKM, saya dapat membuat draft proposal program digital (nama, tujuan, anggaran, sasaran). | High | 3 |
| PROG-02 | Story | **Approval Berjenjang**: Sebagai Ketua DKM, saya dapat menyetujui (approve) atau menolak (reject) proposal program yang diajukan. | High | 3 |
| PROG-03 | Story | **Update Progress**: Sebagai panitia, saya dapat memperbarui status eksekusi program dan kehadiran peserta secara real-time. | High | 2 |
| PROG-04 | Story | **Otomasi LPJ**: Sebagai panitia, saya dapat men-generate Laporan Pertanggungjawaban (LPJ) secara otomatis dari data program. | High | 3 |
| PROG-05 | Story | **Publikasi LPJ**: Sebagai pengurus, saya dapat mempublikasikan LPJ agar bisa diakses publik via tautan/QR Code. | Medium | 2 |

## Epic 3: Manajemen Keuangan Syariah (Finance Service)
**Prioritas: Tinggi (Sprint 2 & 4)**

| ID | Tipe | Judul / User Story | Prioritas | Estimasi |
|---|---|---|---|---|
| FIN-01 | Story | **Pencatatan Pemasukan**: Sebagai bendahara, saya dapat mencatat pemasukan dana yang terpisah secara otomatis (Zakat, Infaq, Shodaqoh, Wakaf, Hibah). | High | 3 |
| FIN-02 | Story | **Pencatatan Pengeluaran**: Sebagai bendahara, saya dapat mencatat pengeluaran dan mengalokasikannya ke program yang telah disetujui. | High | 2 |
| FIN-03 | Story | **Dashboard Keuangan**: Sebagai pengurus, saya dapat melihat ringkasan keuangan real-time (saldo ZISWAF, total pemasukan, pengeluaran). | High | 3 |
| FIN-04 | Story | **Laporan PSAK 109**: Sebagai bendahara, saya dapat men-generate laporan keuangan syariah standar PSAK 109 (PDF/Excel). | High | 5 |
| FIN-05 | Story | **Transparansi Publik**: Sebagai donatur/jamaah, saya dapat melihat visualisasi laporan keuangan publik dari sebuah masjid. | High | 2 |

## Epic 4: Portal Jamaah & Donatur (Donation Service)
**Prioritas: Sedang (Sprint 3)**

| ID | Tipe | Judul / User Story | Prioritas | Estimasi |
|---|---|---|---|---|
| PORT-01 | Story | **Pencarian Masjid**: Sebagai jamaah, saya dapat mencari masjid berdasarkan nama, lokasi, atau kategori program. | Medium | 3 |
| PORT-02 | Story | **Profil Masjid & Program**: Sebagai pengguna, saya dapat melihat profil masjid dan halaman detail program aktif. | High | 2 |
| PORT-03 | Story | **Pendaftaran Program**: Sebagai jamaah, saya dapat mendaftar untuk mengikuti sebuah program/kegiatan masjid. | Medium | 2 |
| PORT-04 | Story | **Pembayaran Manual (Kode Unik)**: Sebagai jamaah, saya berdonasi melalui transfer manual menggunakan kode unik tanpa Payment Gateway. | High | 3 |
| PORT-05 | Story | **Donatur Verified**: Sebagai jamaah, setelah donasi saya berhasil dikonfirmasi, status saya otomatis berubah menjadi **Donatur Verified**. | High | 2 |

## Epic 5: Integrasi Kecerdasan Buatan (AI Service)
**Prioritas: Sedang (Sprint 5)**

| ID | Tipe | Judul / User Story | Prioritas | Estimasi |
|---|---|---|---|---|
| AI-01 | Story | **Chatbot MasjidBot**: Sebagai pengurus DKM, saya dapat berinteraksi dengan AI untuk menyusun proposal, LPJ, atau bertanya hukum tata kelola keuangan. | Medium | 5 |
| AI-02 | Story | **Prediksi Kebutuhan Dana**: Sebagai pengurus, saya dapat melihat prediksi kebutuhan dana bulan depan berbasis histori AI. | Low | 3 |
| AI-03 | Story | **Rekomendasi Program**: Sebagai donatur, saya mendapatkan rekomendasi program yang personal berbasis AI (Collaborative Filtering). | Low | 3 |
| AI-04 | Story | **Deteksi Anomali Keuangan**: Sebagai sistem, AI secara otomatis mendeteksi anomali pada pencatatan transaksi keuangan (Isolation Forest) dan mengirim alert. | Medium | 5 |
| AI-05 | Story | **Analisis Sentimen**: Sebagai pengurus, saya dapat melihat ringkasan analisis sentimen dari feedback jamaah pada program yang telah selesai. | Low | 3 |

## Epic 6: Notifikasi & Integrasi Sistem (Notif Service)
**Prioritas: Sedang (Sprint 3 & 4)**

| ID | Tipe | Judul / User Story | Prioritas | Estimasi |
|---|---|---|---|---|
| NOTF-01 | Story | **WhatsApp Notifikasi (Fonnte)**: Sebagai pengguna, saya menerima pesan konfirmasi pembayaran dan info dari bot WhatsApp via **Fonnte**. | High | 3 |
| NOTF-02 | Story | **Push Notification**: Sebagai pengguna aplikasi mobile, saya menerima notifikasi real-time untuk program baru dan persetujuan. | Medium | 2 |
| NOTF-03 | Story | **Email Receipt**: Sebagai donatur, saya menerima tanda terima resmi (receipt) donasi via email. | Medium | 2 |

## Epic 7: Infrastruktur & Keamanan
**Prioritas: Tinggi (Sprint 1 & Berkelanjutan)**

| ID | Tipe | Judul / User Story | Prioritas | Estimasi |
|---|---|---|---|---|
| INF-01 | Tech | **Setup CI/CD**: Mengatur GitHub Actions untuk build, test, dan deployment otomatis. | High | 2 |
| INF-02 | Tech | **Rate Limiting & WAF**: Menerapkan perlindungan DDoS dan Rate Limiting di API Gateway (Cloudflare). | High | 2 |
| INF-03 | Tech | **Database Schema via Supabase**: Membuat tabel (`users`, `masjids`, `user_masjid_roles`, `programs`, `transactions`, `donations`) langsung di Supabase menggunakan SQL Editor atau Table Editor. Semua query menggunakan **Supabase Client** (`@supabase/supabase-js`), bukan Prisma. | High | 3 |
| INF-04 | Tech | **RLS Database**: Menerapkan Row-Level Security pada Supabase untuk memastikan isolasi data antar masjid (Multi-Tenancy). | High | 3 |

---
**Catatan Estimasi**: Nilai estimasi menggunakan poin Story (1, 2, 3, 5, 8, dst.) yang merefleksikan kompleksitas dan usaha yang diperlukan.

---
**Catatan Arsitektur Database**: Proyek ini menggunakan **Supabase** sebagai database utama. Semua interaksi database dilakukan melalui **Supabase Client** (`@supabase/supabase-js`) — baik dari Server Components, Route Handlers, maupun Client Components. **Prisma ORM tidak digunakan.**
