# ARCHITECTURE.md
# MasjidLink — Arsitektur Sistem

**Versi:** 1.0.0 | **Tanggal:** Mei 2026 | **Penyusun:** Tim Engineering MasjidLink

---

## Daftar Isi

1. [Prinsip Arsitektur](#1-prinsip-arsitektur)
2. [Gambaran High-Level](#2-gambaran-high-level)
3. [Arsitektur Microservices](#3-arsitektur-microservices)
4. [Deskripsi Setiap Service](#4-deskripsi-setiap-service)
5. [Komunikasi Antar Service](#5-komunikasi-antar-service)
6. [Arsitektur Data](#6-arsitektur-data)
7. [Arsitektur Frontend](#7-arsitektur-frontend)
8. [Arsitektur AI](#8-arsitektur-ai)
9. [Infrastruktur & Cloud](#9-infrastruktur--cloud)
10. [Alur Data Kritis](#10-alur-data-kritis)
11. [Keputusan Arsitektur (ADR)](#11-keputusan-arsitektur-adr)
12. [Evolusi Arsitektur](#12-evolusi-arsitektur)

---

## 1. Prinsip Arsitektur

Sistem MasjidLink dibangun di atas prinsip-prinsip berikut:

| Prinsip | Penerapan |
|---------|-----------|
| **Domain-Driven Design** | Setiap service merepresentasikan satu bounded context bisnis |
| **API-First** | Semua interaksi antar komponen melalui kontrak API yang terdefinisi |
| **Observability** | Setiap service menghasilkan log, metrik, dan trace yang terpusat |
| **Security by Default** | Enkripsi, autentikasi, dan otorisasi diterapkan di semua lapisan |
| **Resilience** | Setiap service dapat gagal secara independen tanpa menjatuhkan sistem |
| **Horizontal Scalability** | Setiap komponen dapat di-scale secara independen |
| **Multi-Tenancy** | Satu instance melayani ribuan masjid dengan isolasi data penuh |

---

## 2. Gambaran High-Level

```
╔══════════════════════════════════════════════════════════════════╗
║                         CLIENT LAYER                             ║
║                                                                  ║
║   ┌─────────────────────┐     ┌─────────────────────────────┐   ║
║   │  React Native App   │     │   Next.js Web Portal (PWA)  │   ║
║   │  (iOS & Android)    │     │   (SSR + Static Generation) │   ║
║   └──────────┬──────────┘     └──────────────┬──────────────┘   ║
╚═════════════╪══════════════════════════════╪═════════════════════╝
              │  HTTPS / WSS                 │  HTTPS / WSS
              ▼                              ▼
╔══════════════════════════════════════════════════════════════════╗
║                      EDGE & GATEWAY LAYER                        ║
║                                                                  ║
║   ┌─────────────────────────────────────────────────────────┐   ║
║   │                   Cloudflare CDN + WAF                  │   ║
║   │              (DDoS Protection, SSL Termination)         │   ║
║   └──────────────────────────┬──────────────────────────────┘   ║
║                               │                                  ║
║   ┌──────────────────────────▼──────────────────────────────┐   ║
║   │                     API Gateway                          │   ║
║   │    (Rate Limiting · Auth Middleware · Load Balancing)   │   ║
║   └──────────────────────────┬──────────────────────────────┘   ║
╚═════════════════════════════╪════════════════════════════════════╝
              │ Internal HTTP / gRPC
╔═════════════▼════════════════════════════════════════════════════╗
║                      SERVICE LAYER                               ║
║                                                                  ║
║  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           ║
║  │   Auth   │ │ Program  │ │ Finance  │ │   AI     │           ║
║  │ Service  │ │ Service  │ │ Service  │ │ Service  │           ║
║  └──────────┘ └──────────┘ └──────────┘ └──────────┘           ║
║  ┌──────────┐ ┌──────────┐ ┌──────────┐                        ║
║  │ Donation │ │  Notif   │ │  Search  │                        ║
║  │ Service  │ │ Service  │ │ Service  │                        ║
║  └──────────┘ └──────────┘ └──────────┘                        ║
║                      │  Event Bus (Redis Pub/Sub)               ║
╚═════════════════════╪════════════════════════════════════════════╝
              │
╔═════════════▼════════════════════════════════════════════════════╗
║                        DATA LAYER                                ║
║                                                                  ║
║  ┌──────────────┐  ┌────────┐  ┌──────────┐  ┌─────────────┐  ║
║  │  PostgreSQL  │  │ Redis  │  │  AWS S3  │  │  Firebase   │  ║
║  │  (Primary +  │  │(Cache +│  │(Media &  │  │(Push Notif) │  ║
║  │  Read Replica│  │ Queue) │  │ Docs)    │  │             │  ║
║  └──────────────┘  └────────┘  └──────────┘  └─────────────┘  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 3. Arsitektur Microservices

MasjidLink menggunakan arsitektur **microservices** dengan pendekatan **monorepo** (Turborepo) untuk kemudahan manajemen kode.

### Peta Service

```
api-gateway/           → Entry point semua request client
  ├── auth-service/    → Autentikasi, otorisasi, token management
  ├── program-service/ → CRUD program, workflow approval, LPJ
  ├── finance-service/ → Transaksi, laporan keuangan, PSAK 109
  ├── ai-service/      → Chatbot, rekomendasi, prediksi, anomali
  ├── donation-service/→ Alur donasi, payment gateway, histori
  ├── notif-service/   → Push, email, WhatsApp notification
  └── search-service/  → Full-text search, geolocation filter
```

### Batas Tanggung Jawab (Bounded Context)

| Service | Domain | Basis Data |
|---------|---------|------------|
| `auth-service` | Identitas pengguna, role, sesi | `db_auth` (PostgreSQL) |
| `program-service` | Program, proposal, approval, LPJ | `db_program` (PostgreSQL) |
| `finance-service` | Transaksi, dana ZISWAF, laporan | `db_finance` (PostgreSQL) |
| `ai-service` | Model ML, inferensi, log AI | `db_ai` (PostgreSQL) |
| `donation-service` | Donasi, pembayaran, riwayat | `db_donation` (PostgreSQL) |
| `notif-service` | Queue notifikasi, template | Redis Queue |
| `search-service` | Index pencarian masjid & program | PostgreSQL FTS |

> **Prinsip:** Setiap service memiliki basis datanya sendiri. Tidak ada service yang mengakses database service lain secara langsung.

---

## 4. Deskripsi Setiap Service

### 4.1 API Gateway

**Fungsi:** Single entry point untuk semua request dari client (mobile & web).

**Tanggung jawab:**
- SSL/TLS termination
- Rate limiting: 100 req/menit per IP, 1.000 req/menit per user terautentikasi
- JWT validation & request enrichment (menyuntikkan `userId`, `role`, `masjidId`)
- Routing ke service yang tepat
- Request/response logging terpusat
- Health check aggregation

**Port:** `4000`

---

### 4.2 Auth Service

**Fungsi:** Manajemen identitas, autentikasi, dan otorisasi.

**Endpoint utama:**
- `POST /auth/register` — Registrasi multi-role
- `POST /auth/login` — Login, issue JWT + Refresh Token
- `POST /auth/refresh` — Perbarui access token
- `POST /auth/verify-otp` — Verifikasi OTP email/HP
- `POST /auth/logout` — Invalidasi token

**Mekanisme:**
- Password: Bcrypt (cost factor 12)
- Access Token: JWT, TTL 1 jam
- Refresh Token: Opaque token tersimpan di Redis, TTL 30 hari
- OTP: 6 digit, TTL 15 menit, maksimal 3 percobaan

---

### 4.3 Program Service

**Fungsi:** Manajemen siklus hidup program masjid.

**State machine program:**
```
DRAFT → SUBMITTED → IN_REVIEW → APPROVED → RUNNING → COMPLETED → LPJ_PUBLISHED
                               ↘ REJECTED → DRAFT (revisi)
```

**Endpoint utama:**
- `POST /programs` — Buat proposal
- `POST /programs/:id/submit` — Ajukan proposal
- `POST /programs/:id/approve` — Setujui (Ketua DKM)
- `POST /programs/:id/reject` — Tolak dengan catatan
- `PUT /programs/:id/progress` — Update progress eksekusi
- `POST /programs/:id/lpj` — Submit LPJ

---

### 4.4 Finance Service

**Fungsi:** Pencatatan keuangan syariah dan pelaporan PSAK 109.

**Komponen kritis:**
- **Ledger Engine** — Double-entry bookkeeping untuk setiap transaksi
- **Fund Segregator** — Pemisahan otomatis dana per jenis (Zakat, Infaq, dll.)
- **Report Generator** — Menghasilkan laporan PSAK 109, PDF, Excel
- **Anomaly Detector** — Memanggil AI Service untuk deteksi anomali

**Aturan kritis:**
- Setiap transaksi bersifat **immutable** — tidak dapat dihapus, hanya dapat di-reverse
- Dana zakat **tidak dapat** dialokasikan ke program non-mustahiq tanpa konfirmasi ketua DKM

---

### 4.5 AI Service

**Fungsi:** Orkestrasi semua fitur kecerdasan buatan.

**Komponen:**
- `ChatbotEngine` — Wrapper Claude API dengan context injection
- `RecommendationEngine` — Python FastAPI, Collaborative Filtering
- `ForecastEngine` — Python FastAPI, Facebook Prophet
- `AnomalyDetector` — Python FastAPI, Isolation Forest
- `SentimentAnalyzer` — Python FastAPI, IndoBERT

Detail teknis → lihat [AI_SPEC.md](./AI_SPEC.md)

---

### 4.6 Donation Service

**Fungsi:** Orkestrasi alur donasi dari klik donatur hingga pencatatan di laporan keuangan.

**Alur:**
```
Donatur Klik Donasi
    → Buat Order (donation-service)
    → Buat Payment (Midtrans)
    → Redirect ke Payment Page
    → Webhook Callback (Midtrans → donation-service)
    → Update Status Donasi
    → Kirim Bukti ke Donatur (notif-service)
    → Catat Transaksi (finance-service via event)
```

---

### 4.7 Notification Service

**Fungsi:** Pengiriman semua notifikasi ke pengguna.

**Channel yang didukung:**
- Push Notification (Firebase FCM)
- WhatsApp (WhatsApp Business API)
- Email (SendGrid)
- In-app notification (tersimpan di DB)

**Arsitektur:** Queue-based menggunakan Redis Bull. Setiap notifikasi diproses secara asinkron untuk menghindari blocking request utama.

---

## 5. Komunikasi Antar Service

### Sinkronus (REST / gRPC)
Digunakan untuk operasi yang membutuhkan respons langsung:
- Client → API Gateway: **REST over HTTPS**
- API Gateway → Services: **gRPC** (internal, lebih efisien)

### Asinkronus (Event Bus)
Digunakan untuk operasi yang tidak membutuhkan respons langsung:
- Implementasi: **Redis Pub/Sub**
- Pattern: **Event-Driven Architecture**

**Contoh event:**
```
program.approved       → notif-service: kirim notifikasi ke pengaju
donation.paid          → finance-service: catat transaksi pemasukan
                       → notif-service: kirim bukti ke donatur
program.completed      → ai-service: update model rekomendasi
transaction.created    → ai-service: jalankan anomaly detection
feedback.submitted     → ai-service: jalankan sentiment analysis
```

---

## 6. Arsitektur Data

### 6.1 Strategi Multi-Tenancy

MasjidLink menggunakan **Row-Level Security (RLS)** PostgreSQL dengan kolom `masjid_id` di setiap tabel. Setiap query secara otomatis difilter berdasarkan `masjid_id` dari JWT token pengguna.

```sql
-- Contoh RLS Policy
CREATE POLICY masjid_isolation ON programs
  USING (masjid_id = current_setting('app.current_masjid_id')::uuid);
```

### 6.2 Schema Database Utama

#### Tabel `users`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
email           VARCHAR(255) UNIQUE
phone           VARCHAR(20) UNIQUE
password_hash   VARCHAR(255) NOT NULL
role            user_role_enum NOT NULL  -- 'jamaah' | 'donatur' | 'pengurus' | 'admin'
status          user_status_enum DEFAULT 'pending_verification'
full_name       VARCHAR(255)
avatar_url      TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

#### Tabel `masjids`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
name            VARCHAR(255) NOT NULL
slug            VARCHAR(255) UNIQUE NOT NULL
address         TEXT NOT NULL
city            VARCHAR(100)
province        VARCHAR(100)
latitude        DECIMAL(10,8)
longitude       DECIMAL(11,8)
description     TEXT
photo_url       TEXT
status          masjid_status_enum DEFAULT 'pending'
created_at      TIMESTAMPTZ DEFAULT NOW()
```

#### Tabel `programs`
```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
masjid_id           UUID NOT NULL REFERENCES masjids(id)
title               VARCHAR(255) NOT NULL
category            program_category_enum NOT NULL
description         TEXT
objectives          TEXT
target_beneficiaries INTEGER
budget_plan         NUMERIC(15,2)
budget_realized     NUMERIC(15,2) DEFAULT 0
start_date          DATE
end_date            DATE
status              program_status_enum DEFAULT 'draft'
created_by          UUID REFERENCES users(id)
approved_by         UUID REFERENCES users(id)
approved_at         TIMESTAMPTZ
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
```

#### Tabel `transactions`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
masjid_id       UUID NOT NULL REFERENCES masjids(id)
program_id      UUID REFERENCES programs(id)
type            transaction_type_enum NOT NULL  -- 'income' | 'expense'
amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0)
fund_category   fund_category_enum NOT NULL
source_dest     VARCHAR(255)
description     TEXT
evidence_url    TEXT
recorded_by     UUID NOT NULL REFERENCES users(id)
transaction_date DATE NOT NULL
is_reversed     BOOLEAN DEFAULT false
reversal_of     UUID REFERENCES transactions(id)
created_at      TIMESTAMPTZ DEFAULT NOW()
-- IMMUTABLE: tidak ada UPDATE atau DELETE, hanya INSERT + reversal
```

#### Tabel `donations`
```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
donor_id          UUID NOT NULL REFERENCES users(id)
program_id        UUID REFERENCES programs(id)
masjid_id         UUID NOT NULL REFERENCES masjids(id)
amount            NUMERIC(15,2) NOT NULL
fund_category     fund_category_enum NOT NULL
payment_method    payment_method_enum
payment_status    payment_status_enum DEFAULT 'pending'
midtrans_order_id VARCHAR(255) UNIQUE
receipt_url       TEXT
donated_at        TIMESTAMPTZ DEFAULT NOW()
```

### 6.3 Indeks Penting

```sql
-- Performa pencarian program
CREATE INDEX idx_programs_masjid_status ON programs(masjid_id, status);
CREATE INDEX idx_programs_category ON programs(category);

-- Performa laporan keuangan
CREATE INDEX idx_transactions_masjid_date ON transactions(masjid_id, transaction_date DESC);
CREATE INDEX idx_transactions_fund_category ON transactions(masjid_id, fund_category);

-- Performa pencarian donasi
CREATE INDEX idx_donations_donor ON donations(donor_id, donated_at DESC);
CREATE INDEX idx_donations_program ON donations(program_id);

-- Full-text search masjid
CREATE INDEX idx_masjids_fts ON masjids USING GIN(to_tsvector('indonesian', name || ' ' || city));
```

### 6.4 Strategi Backup

| Jenis | Frekuensi | Retensi | Lokasi |
|-------|-----------|---------|--------|
| Full backup | Harian (02:00 WIB) | 30 hari | S3 ap-southeast-1 |
| Incremental | Per jam | 7 hari | S3 ap-southeast-1 |
| Point-in-time | Kontinu (WAL streaming) | 7 hari | S3 ap-southeast-2 |
| Snapshot | Mingguan | 12 bulan | S3 Glacier |

---

## 7. Arsitektur Frontend

### 7.1 Next.js Web Portal

```
/app
├── (public)/               # Route grup: tanpa autentikasi
│   ├── page.tsx            # Landing page
│   ├── masjid/
│   │   ├── page.tsx        # Direktori masjid
│   │   └── [slug]/page.tsx # Profil publik masjid
│   └── program/[id]/page.tsx
│
├── (auth)/                 # Route grup: halaman auth
│   ├── login/page.tsx
│   └── register/page.tsx
│
├── (dashboard)/            # Route grup: memerlukan autentikasi
│   ├── pengurus/           # Dashboard DKM
│   │   ├── page.tsx        # Overview
│   │   ├── program/        # Manajemen program
│   │   └── keuangan/       # Manajemen keuangan
│   ├── jamaah/             # Dashboard jamaah
│   └── donatur/            # Dashboard donatur
│
└── api/                    # API Routes (BFF pattern)
    └── [...]/route.ts
```

**Strategi Rendering:**
- Halaman publik (direktori, profil): **Static Site Generation (SSG)** + **ISR** (revalidate 5 menit)
- Dashboard: **Server-Side Rendering (SSR)** untuk data sensitif
- Komponen interaktif: **Client Components** dengan React Query

### 7.2 React Native Mobile App

```
/src
├── screens/
│   ├── auth/               # Login, Register, OTP
│   ├── jamaah/             # Home, Search, Program Detail
│   ├── donatur/            # Dashboard, Donasi, History
│   └── pengurus/           # Dashboard, Program, Keuangan
├── components/
│   ├── ui/                 # Button, Card, Input, dll.
│   ├── program/            # ProgramCard, ProgramDetail
│   └── keuangan/           # TransactionItem, FinanceChart
├── navigation/
│   ├── RootNavigator.tsx
│   └── TabNavigators/
├── store/                  # Zustand stores
├── hooks/                  # useAuth, useProgram, dll.
└── api/                    # API client (React Query)
```

---

## 8. Arsitektur AI

```
┌─────────────────────────────────────────────────────┐
│                   AI Service (Node.js)               │
│                                                      │
│  ┌─────────────────────────────────────────────────┐│
│  │              AI Orchestrator                     ││
│  │  (Routing request ke engine yang tepat)         ││
│  └───────┬───────┬──────────┬──────────┬───────────┘│
│          │       │          │          │             │
│  ┌───────▼─┐ ┌───▼────┐ ┌──▼─────┐ ┌─▼──────────┐ │
│  │Chatbot  │ │Recomm. │ │Forecast│ │  Anomaly   │ │
│  │(Claude) │ │Engine  │ │Engine  │ │ + Sentiment│ │
│  └─────────┘ └────────┘ └────────┘ └────────────┘ │
│          │       │          │          │             │
│          └───────┴──────────┴──────────┘             │
│                         │                            │
│              ┌──────────▼──────────┐                 │
│              │  Python ML Services │                 │
│              │  (FastAPI, port 8000)│                │
│              └─────────────────────┘                 │
└─────────────────────────────────────────────────────┘
```

Detail spesifikasi AI → lihat [AI_SPEC.md](./AI_SPEC.md)

---

## 9. Infrastruktur & Cloud

### 9.1 AWS Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           AWS Account                           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   VPC (10.0.0.0/16)                      │  │
│  │                                                          │  │
│  │  ┌─────────────────────┐  ┌─────────────────────────┐  │  │
│  │  │  Public Subnet      │  │   Private Subnet         │  │  │
│  │  │  (ap-southeast-1a)  │  │   (ap-southeast-1a)      │  │  │
│  │  │                     │  │                           │  │  │
│  │  │  ┌──────────────┐  │  │  ┌─────────────────────┐ │  │  │
│  │  │  │ ALB (Load    │  │  │  │  EKS Node Group     │ │  │  │
│  │  │  │ Balancer)    │  │  │  │  (EC2 t3.medium x3) │ │  │  │
│  │  │  └──────────────┘  │  │  └─────────────────────┘ │  │  │
│  │  └─────────────────────┘  │                           │  │  │
│  │                            │  ┌─────────────────────┐ │  │  │
│  │                            │  │  RDS PostgreSQL      │ │  │  │
│  │                            │  │  (Multi-AZ)          │ │  │  │
│  │                            │  └─────────────────────┘ │  │  │
│  │                            │  ┌─────────────────────┐ │  │  │
│  │                            │  │  ElastiCache Redis   │ │  │  │
│  │                            │  └─────────────────────┘ │  │  │
│  │                            └─────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │  S3 Buckets │  │  CloudFront  │  │  Secrets Manager   │   │
│  └─────────────┘  └──────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Kubernetes Setup

**Namespace:**
- `masjidlink-prod` — Production workloads
- `masjidlink-staging` — Staging environment
- `monitoring` — Grafana, Prometheus
- `logging` — ELK Stack

**Resource per Service (Production):**

| Service | Replicas | CPU Request | Memory Request |
|---------|----------|-------------|----------------|
| api-gateway | 3 | 250m | 256Mi |
| auth-service | 2 | 200m | 256Mi |
| program-service | 2 | 200m | 256Mi |
| finance-service | 2 | 300m | 512Mi |
| ai-service | 2 | 500m | 1Gi |
| donation-service | 2 | 200m | 256Mi |
| notif-service | 2 | 100m | 128Mi |

### 9.3 CI/CD Pipeline

```
Push ke branch develop/feat/*
         │
         ▼
   [GitHub Actions]
         │
    ┌────┴────┐
    │  Lint   │ ← ESLint, Prettier, TypeScript check
    └────┬────┘
         │
    ┌────▼────┐
    │  Test   │ ← Unit test, Integration test (Jest)
    └────┬────┘
         │
    ┌────▼────┐
    │  Build  │ ← Build Docker images
    └────┬────┘
         │
    ┌────▼──────────┐
    │ Push Registry │ ← ECR (AWS Elastic Container Registry)
    └────┬──────────┘
         │
    ┌────▼───────────────┐
    │ Deploy to Staging  │ ← Otomatis (branch develop)
    └────┬───────────────┘
         │ Manual approval
    ┌────▼──────────────────┐
    │ Deploy to Production  │ ← Butuh 1 reviewer approval
    └───────────────────────┘
```

---

## 10. Alur Data Kritis

### 10.1 Alur Donasi End-to-End

```
1. Donatur klik "Dukung Program" (Web/Mobile)
2. Client → API Gateway: POST /donations
3. API Gateway → donation-service: validate request
4. donation-service → Midtrans: create payment order
5. Midtrans → Client: redirect URL payment page
6. User bayar di Midtrans
7. Midtrans → donation-service: POST /webhook/midtrans (callback)
8. donation-service: update donation status = PAID
9. donation-service → event bus: emit `donation.paid`
10. finance-service ← event bus: consume `donation.paid`
    → catat transaksi pemasukan
11. notif-service ← event bus: consume `donation.paid`
    → kirim bukti donasi ke donatur (email + push)
```

### 10.2 Alur Approval Program

```
1. Panitia submit proposal → program-service: POST /programs/:id/submit
2. program-service: update status = SUBMITTED
3. program-service → event bus: emit `program.submitted`
4. notif-service: kirim notif ke Ketua DKM
5. Ketua DKM review → POST /programs/:id/approve atau /reject
6. program-service: update status = APPROVED / REJECTED
7. program-service → event bus: emit `program.approved` atau `program.rejected`
8. notif-service: kirim notif ke pengaju proposal
```

### 10.3 Alur Laporan Keuangan PSAK 109

```
1. Pengurus request laporan → finance-service: GET /reports/psak109?month=2026-04
2. finance-service: aggregate semua transaksi bulan tersebut per fund_category
3. finance-service → ReportGenerator: generate PSAK 109 structure
   a. Laporan Posisi Keuangan
   b. Laporan Perubahan Dana (Zakat, Infaq, Amil, dll.)
   c. Laporan Arus Kas
4. ReportGenerator → PDF Generator: render ke PDF
5. PDF disimpan ke S3 dengan URL signed (1 jam untuk pengurus, publik untuk laporan final)
6. Response ke client: URL laporan PDF
```

---

## 11. Keputusan Arsitektur (ADR)

### ADR-001: Monorepo dengan Turborepo

**Konteks:** Sistem memiliki banyak aplikasi (mobile, web, services) yang berbagi kode.  
**Keputusan:** Gunakan monorepo dengan Turborepo.  
**Alasan:** Memudahkan berbagi TypeScript types, komponen UI, dan utilities. Turborepo menyediakan caching build yang efisien.  
**Tradeoff:** Kompleksitas setup awal lebih tinggi.

### ADR-002: PostgreSQL sebagai Database Utama

**Konteks:** Perlu database yang kuat untuk laporan keuangan dan transaksi finansial.  
**Keputusan:** PostgreSQL dengan Row-Level Security untuk multi-tenancy.  
**Alasan:** ACID compliance kritis untuk data keuangan. RLS memungkinkan isolasi data antar masjid tanpa overhead arsitektur terpisah.  
**Tradeoff:** Lebih kompleks daripada NoSQL untuk skalabilitas horizontal.

### ADR-003: Event-Driven untuk Komunikasi Antar Service

**Konteks:** Beberapa operasi (notifikasi, pencatatan sekunder) tidak perlu sinkronus.  
**Keputusan:** Redis Pub/Sub sebagai event bus internal.  
**Alasan:** Decoupling service, mencegah cascade failure, performa lebih baik.  
**Tradeoff:** Eventual consistency — beberapa operasi tidak langsung terefleksi.

### ADR-004: Claude API untuk Chatbot, bukan Model In-House

**Konteks:** DKM memerlukan chatbot yang cerdas untuk membantu manajemen.  
**Keputusan:** Gunakan Anthropic Claude API.  
**Alasan:** Kualitas respons jauh lebih baik, tidak perlu infrastruktur ML sendiri, mendukung Bahasa Indonesia.  
**Tradeoff:** Biaya per request, ketergantungan vendor, data percakapan melewati API eksternal.

### ADR-005: Immutable Transactions

**Konteks:** Data keuangan masjid harus terpercaya dan tidak dapat dimanipulasi.  
**Keputusan:** Transaksi keuangan bersifat immutable — hanya INSERT, tidak ada UPDATE/DELETE.  
**Alasan:** Integritas audit trail, kepercayaan jamaah dan donatur, prinsip akuntansi syariah.  
**Tradeoff:** Perlu mekanisme reversal untuk koreksi kesalahan input.

---

## 12. Evolusi Arsitektur

### Fase 1 (MVP — Bulan 1-6)
- Semua service dalam satu Kubernetes cluster
- PostgreSQL single instance dengan read replica
- Redis single node
- Monitoring dasar dengan Grafana

### Fase 2 (Growth — Bulan 7-12)
- Database sharding berdasarkan `masjid_id`
- Elasticsearch untuk full-text search yang lebih canggih
- Dedicated AI cluster untuk Python ML services
- Multi-region deployment (Jakarta + Surabaya)

### Fase 3 (Scale — Tahun 2+)
- Global CDN untuk konten publik
- CQRS pattern untuk read/write separation di service keuangan
- Event sourcing untuk audit trail yang lebih kuat
- GraphQL Federation untuk unified API schema

---

*Dokumen ini diperbarui setiap ada perubahan arsitektur signifikan. Setiap perubahan harus melalui proses ADR (Architecture Decision Record).*

**MasjidLink Engineering** | *Build with purpose, scale with trust* 🕌
