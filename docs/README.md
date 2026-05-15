# MasjidLink 🕌

> **Masjid yang Transparan, Berdampak, dan Terhubung**

MasjidLink adalah platform digital terintegrasi untuk manajemen masjid modern — menggabungkan manajemen program, keuangan syariah berbasis PSAK 109, dan kecerdasan buatan (AI) dalam satu ekosistem yang dapat diakses oleh pengurus DKM, jamaah, dan donatur.

---

## Daftar Isi

- [Tentang Produk](#tentang-produk)
- [Fitur Utama](#fitur-utama)
- [Struktur Repositori](#struktur-repositori)
- [Tech Stack](#tech-stack)
- [Memulai (Getting Started)](#memulai-getting-started)
- [Panduan Pengembangan](#panduan-pengembangan)
- [Variabel Lingkungan](#variabel-lingkungan)
- [Menjalankan Aplikasi](#menjalankan-aplikasi)
- [Menjalankan Tes](#menjalankan-tes)
- [Deployment](#deployment)
- [Kontribusi](#kontribusi)
- [Dokumentasi Lengkap](#dokumentasi-lengkap)
- [Tim](#tim)
- [Lisensi](#lisensi)

---

## Tentang Produk

MasjidLink hadir untuk menjawab tantangan nyata yang dihadapi ribuan masjid di Indonesia:

| Masalah | Solusi MasjidLink |
|---------|-------------------|
| Proposal & LPJ program masih manual, via kertas/chat | Workflow digital Proposal → Approval → Eksekusi → LPJ |
| Laporan keuangan tidak transparan | Dashboard keuangan publik real-time, laporan PSAK 109 |
| Program masjid tidak terjangkau publik | Direktori publik & pencarian program berbasis lokasi |
| Tidak ada data dampak terukur | Tracking penerima manfaat, partisipasi, & rating program |

**Pengguna yang dilayani:**
- 🟠 **Pengurus / DKM** — Full access: kelola program, keuangan, analytics
- 🟢 **Jamaah** — Cari masjid, ikuti program, lihat kontribusi masjid
- 💚 **Donatur** — Semua akses jamaah + tracking donasi & rekomendasi AI

---

## Fitur Utama

### 📋 Manajemen Program
- Workflow digital: Proposal → Approval → Eksekusi → LPJ
- Approval berjenjang dengan notifikasi otomatis
- Tracking dampak real-time: penerima manfaat, peserta, dana terserap
- LPJ otomatis dapat diakses publik via tautan & QR Code

### 💰 Manajemen Keuangan Syariah
- Pencatatan pemasukan ZISWAF (Zakat, Infaq, Shodaqoh, Wakaf, Hibah)
- Dashboard real-time: pemasukan, pengeluaran, saldo, distribusi dana
- Laporan keuangan otomatis sesuai **PSAK 109**
- Audit trail setiap transaksi — tidak dapat dimodifikasi
- Export laporan PDF & Excel

### 🤖 Fitur AI
- **MasjidBot** — Chatbot asisten DKM 24/7 (Claude API)
- **Prediksi Dana** — Forecast kebutuhan program bulan depan
- **Rekomendasi Program** — Personalisasi untuk donatur
- **Deteksi Anomali** — Peringatan dini transaksi mencurigakan
- **Analisis Sentimen** — Insight dari feedback jamaah

### 🔍 Portal Publik
- Direktori masjid dengan filter lokasi & kategori program
- Profil masjid lengkap dengan statistik dampak kumulatif
- Halaman detail program dengan progress donasi

---

## Struktur Repositori

```
masjidlink/
├── apps/
│   ├── mobile/                 # React Native (iOS & Android)
│   │   ├── src/
│   │   │   ├── screens/        # Halaman aplikasi
│   │   │   ├── components/     # Komponen reusable
│   │   │   ├── navigation/     # React Navigation setup
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── store/          # Zustand state management
│   │   │   └── utils/          # Helper functions
│   │   └── package.json
│   │
│   └── web/                    # Next.js Web Portal
│       ├── src/
│       │   ├── app/            # App Router (Next.js 14)
│       │   ├── components/     # Komponen UI
│       │   ├── lib/            # Utilities & API client
│       │   └── styles/         # TailwindCSS config
│       └── package.json
│
├── services/
│   ├── api-gateway/            # API Gateway & BFF
│   ├── auth-service/           # Autentikasi & otorisasi
│   ├── program-service/        # Manajemen program & LPJ
│   ├── finance-service/        # Keuangan & laporan PSAK 109
│   ├── ai-service/             # Integrasi AI & ML
│   ├── notification-service/   # Push notif & WhatsApp
│   └── donation-service/       # Donasi & payment gateway
│
├── packages/
│   ├── shared-types/           # TypeScript types bersama
│   ├── ui-components/          # Design system komponen
│   └── utils/                  # Shared utilities
│
├── infra/
│   ├── terraform/              # Infrastructure as Code
│   ├── k8s/                    # Kubernetes manifests
│   └── docker/                 # Dockerfiles
│
├── docs/
│   ├── README.md               # Dokumen ini
│   ├── ARCHITECTURE.md         # Arsitektur sistem
│   ├── AI_SPEC.md              # Spesifikasi fitur AI
│   ├── COMPLIANCE.md           # Kepatuhan syariah & regulasi
│   ├── SECURITY.md             # Kebijakan keamanan
│   ├── BUSINESS_RULES.md       # Aturan bisnis & logika domain
│   └── DEV_GUIDE.md            # Panduan pengembang
│
├── scripts/                    # Automation scripts
├── .github/
│   ├── workflows/              # GitHub Actions CI/CD
│   └── PULL_REQUEST_TEMPLATE.md
├── turbo.json                  # Turborepo config
├── package.json                # Root package.json (monorepo)
└── docker-compose.yml          # Local development stack
```

---

## Tech Stack

| Layer | Teknologi | Versi |
|-------|-----------|-------|
| **Mobile** | React Native (Expo) | 0.73+ |
| **Web** | Next.js | 14+ |
| **Styling** | TailwindCSS + NativeWind | 3.x |
| **Backend Runtime** | Node.js | 20 LTS |
| **Backend Framework** | NestJS | 10+ |
| **API** | REST + GraphQL (Apollo) | — |
| **Database** | PostgreSQL | 15+ |
| **Cache / Queue** | Redis | 7+ |
| **File Storage** | Amazon S3 | — |
| **AI Chatbot** | Anthropic Claude API | claude-sonnet |
| **ML / Prediksi** | Python + Prophet + scikit-learn | — |
| **Notifikasi Push** | Firebase Cloud Messaging | — |
| **Notifikasi WA** | WhatsApp Business API | — |
| **Payment** | Midtrans | — |
| **Container** | Docker + Kubernetes (EKS) | — |
| **CI/CD** | GitHub Actions | — |
| **Monitoring** | Grafana + Prometheus | — |

---

## Memulai (Getting Started)

### Prasyarat

Pastikan perangkat Anda memiliki:

```bash
node  >= 20.0.0
npm   >= 10.0.0
docker >= 24.0.0
docker-compose >= 2.20.0
```

### Instalasi

```bash
# 1. Clone repositori
git clone https://github.com/masjidlink/masjidlink.git
cd masjidlink

# 2. Instal semua dependensi (monorepo)
npm install

# 3. Copy file environment
cp .env.example .env.local

# 4. Isi variabel environment yang diperlukan (lihat bagian Variabel Lingkungan)
nano .env.local
```

---

## Variabel Lingkungan

Buat file `.env.local` di root project dengan variabel berikut:

```env
# ─── DATABASE ────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@localhost:5432/masjidlink
REDIS_URL=redis://localhost:6379

# ─── AUTENTIKASI ─────────────────────────────────────────
JWT_SECRET=your_super_secret_key_min_32_chars
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_SECRET=your_refresh_secret_key
REFRESH_TOKEN_EXPIRES_IN=30d

# ─── STORAGE ─────────────────────────────────────────────
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=masjidlink-storage

# ─── AI ──────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-your-claude-api-key

# ─── PAYMENT ─────────────────────────────────────────────
MIDTRANS_SERVER_KEY=SB-Mid-server-your-key
MIDTRANS_CLIENT_KEY=SB-Mid-client-your-key
MIDTRANS_IS_PRODUCTION=false

# ─── NOTIFIKASI ──────────────────────────────────────────
FIREBASE_PROJECT_ID=masjidlink-firebase
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=firebase@masjidlink.iam.gserviceaccount.com
WHATSAPP_API_TOKEN=your_whatsapp_business_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# ─── EMAIL ───────────────────────────────────────────────
SENDGRID_API_KEY=SG.your-sendgrid-key
EMAIL_FROM=noreply@masjidlink.id

# ─── MAPS ────────────────────────────────────────────────
GOOGLE_MAPS_API_KEY=your_google_maps_key

# ─── APLIKASI ────────────────────────────────────────────
APP_ENV=development
APP_PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

> ⚠️ **Jangan pernah commit file `.env.local` ke repositori.** File ini sudah tercantum di `.gitignore`.

---

## Menjalankan Aplikasi

### Development (Lokal)

```bash
# Jalankan seluruh stack infrastruktur (database, redis, dll.)
docker-compose up -d

# Jalankan migrasi database
npm run db:migrate

# Jalankan seed data (opsional)
npm run db:seed

# Jalankan semua service sekaligus (Turborepo)
npm run dev

# Atau jalankan service tertentu saja
npm run dev --filter=web          # Next.js web portal
npm run dev --filter=mobile       # React Native (Expo)
npm run dev --filter=api-gateway  # API Gateway
```

### URL Lokal

| Service | URL |
|---------|-----|
| Web Portal | http://localhost:3000 |
| API Gateway | http://localhost:4000 |
| API Docs (Swagger) | http://localhost:4000/docs |
| Metabase (Analytics) | http://localhost:4001 |
| Redis Commander | http://localhost:8081 |

---

## Menjalankan Tes

```bash
# Semua tes (unit + integrasi)
npm run test

# Hanya tes unit
npm run test:unit

# Hanya tes integrasi
npm run test:integration

# Tes end-to-end
npm run test:e2e

# Coverage report
npm run test:coverage

# Tes untuk service tertentu
npm run test --filter=finance-service
```

**Target coverage minimum: 70%** untuk semua service backend.

---

## Deployment

### Staging

```bash
# Otomatis via GitHub Actions saat push ke branch `develop`
git push origin develop
```

### Production

```bash
# Otomatis via GitHub Actions saat merge ke branch `main`
# Memerlukan approval dari minimal 1 reviewer
git checkout main
git merge develop
git push origin main
```

### Manual Deploy (Emergency)

```bash
# Build semua image
npm run build:docker

# Push ke registry
npm run push:docker

# Apply Kubernetes manifests
kubectl apply -f infra/k8s/production/
```

---

## Kontribusi

Kami menyambut kontribusi dari siapa pun. Silakan ikuti langkah berikut:

1. Fork repositori ini
2. Buat branch fitur: `git checkout -b feat/nama-fitur`
3. Commit perubahan: `git commit -m 'feat: tambahkan fitur X'`
4. Push ke branch: `git push origin feat/nama-fitur`
5. Buat Pull Request ke branch `develop`

### Konvensi Commit

Gunakan format [Conventional Commits](https://www.conventionalcommits.org/):

```
feat:     Fitur baru
fix:      Perbaikan bug
docs:     Perubahan dokumentasi
style:    Formatting (tanpa perubahan logika)
refactor: Refactoring kode
test:     Menambah atau mengubah tes
chore:    Update dependensi, konfigurasi
```

---

## Dokumentasi Lengkap

| Dokumen | Deskripsi |
|---------|-----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Desain arsitektur sistem, diagram, keputusan teknis |
| [AI_SPEC.md](./AI_SPEC.md) | Spesifikasi teknis seluruh fitur AI |
| [COMPLIANCE.md](./COMPLIANCE.md) | Kepatuhan syariah (PSAK 109, DSN-MUI) & regulasi (UU PDP) |
| [SECURITY.md](./SECURITY.md) | Kebijakan keamanan, autentikasi, enkripsi |
| [BUSINESS_RULES.md](./BUSINESS_RULES.md) | Aturan bisnis & logika domain sistem |
| [DEV_GUIDE.md](./DEV_GUIDE.md) | Panduan lengkap untuk developer |

---

## Tim

| Peran | Nama | Kontak |
|-------|------|--------|
| Product Manager | Thifal Yumna Nazihah | — |
| Lead Backend Engineer | TBD | — |
| Lead Frontend Engineer | TBD | — |
| AI Engineer | TBD | — |
| UI/UX Designer | TBD | — |
| Konsultan Syariah | TBD | — |

---

## Lisensi

Copyright © 2026 MasjidLink. Hak cipta dilindungi undang-undang.  
Lihat file [LICENSE](../LICENSE) untuk detail.

---

<p align="center">
  <strong>MasjidLink</strong> — Masjid yang Transparan, Berdampak, dan Terhubung 🕌
</p>
