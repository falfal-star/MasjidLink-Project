# AI_SPEC.md
# MasjidLink — Spesifikasi Teknis Kecerdasan Buatan (AI)

**Versi:** 1.0.0 | **Tanggal:** Mei 2026 | **Penyusun:** AI Engineer & Developer MasjidLink  
**Audience:** Developer, AI Engineer

---

## Daftar Isi

1. [Gambaran Arsitektur AI](#1-gambaran-arsitektur-ai)
2. [AI Prompt Registry](#2-ai-prompt-registry)
3. [OCR Integration](#3-ocr-integration)
4. [WhatsApp Bot Flow](#4-whatsapp-bot-flow)
5. [Integration Contracts](#5-integration-contracts)
6. [Model Rekomendasi Program](#6-model-rekomendasi-program)
7. [Model Prediksi Dana](#7-model-prediksi-dana)
8. [Deteksi Anomali Keuangan](#8-deteksi-anomali-keuangan)
9. [Sentiment Analysis](#9-sentiment-analysis)
10. [Error Handling & Fallback Strategy](#10-error-handling--fallback-strategy)
11. [Monitoring & Evaluation AI](#11-monitoring--evaluation-ai)

---

## 1. Gambaran Arsitektur AI

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI SERVICE LAYER                         │
│                    (Node.js Orchestrator)                       │
│                                                                 │
│  POST /ai/chat          → ChatbotEngine      (Claude API)       │
│  GET  /ai/recommend     → RecommendEngine    (Python FastAPI)   │
│  GET  /ai/forecast      → ForecastEngine     (Python FastAPI)   │
│  POST /ai/anomaly       → AnomalyDetector    (Python FastAPI)   │
│  POST /ai/sentiment     → SentimentAnalyzer  (Python FastAPI)   │
│  POST /ai/ocr           → OCREngine          (Python FastAPI)   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Prompt Registry                          │ │
│  │   (Versioned system prompts, templates, guardrails)        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Context Manager                          │ │
│  │   (Conversation history, masjid data injection)            │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
  Anthropic Claude API   Python ML Services   WhatsApp Bot
  (claude-sonnet-4-5)    (FastAPI port 8001)  (via notif-service)
```

---

## 2. AI Prompt Registry

Semua system prompt dan template prompt disimpan secara terpusat di tabel `ai_prompts` (database) dan di-cache di Redis. Setiap prompt memiliki versi agar rollback mudah dilakukan.

### 2.1 Skema Tabel `ai_prompts`

```sql
CREATE TABLE ai_prompts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL UNIQUE,  -- identifier unik
  version     VARCHAR(20) NOT NULL,          -- semver: '1.0.0'
  type        VARCHAR(50) NOT NULL,          -- 'system' | 'user_template' | 'few_shot'
  content     TEXT NOT NULL,                 -- isi prompt
  variables   JSONB,                         -- variabel yang bisa diinjeksi: ["masjid_name", ...]
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Registry Prompt: MasjidBot (Chatbot DKM)

#### PROMPT-001: `chatbot_dkm_system` (v1.2.0)

```
Kamu adalah MasjidBot, asisten digital cerdas untuk {{masjid_name}} yang dibangun oleh MasjidLink.
Kamu membantu pengurus DKM (Dewan Kemakmuran Masjid) dalam mengelola operasional masjid sehari-hari.

IDENTITAS & KARAKTER:
- Nama: MasjidBot
- Bahasa: Bahasa Indonesia yang sopan, hangat, dan profesional
- Sapaan: Gunakan "Bapak/Ibu" untuk pengurus, "Saudara/i" untuk jamaah umum

KONTEKS MASJID SAAT INI:
- Nama Masjid: {{masjid_name}}
- Kota: {{masjid_city}}
- Program Aktif: {{active_programs_count}} program
- Saldo Kas Bulan Ini: {{current_balance}} (jangan sebutkan angka spesifik ke jamaah umum)
- Proposal Menunggu Approval: {{pending_proposals_count}}

KEMAMPUANMU:
1. Menjawab pertanyaan seputar program masjid yang sedang berjalan
2. Membantu menyusun draft proposal program baru
3. Menjelaskan cara penggunaan fitur MasjidLink
4. Memberikan panduan umum akuntansi dan pengelolaan keuangan masjid
5. Menjelaskan ketentuan ZISWAF secara umum (zakat, infaq, shodaqoh, wakaf)
6. Membantu menyusun konten pengumuman untuk jamaah

BATASAN KETAT (JANGAN DILANGGAR):
- JANGAN memberikan fatwa hukum Islam — selalu rujuk ke ulama atau MUI setempat
- JANGAN mengakses atau menyebutkan detail keuangan pribadi pengguna
- JANGAN membuat keputusan approval program — hanya DKM yang berwenang
- JANGAN mengklaim bisa melakukan hal yang tidak ada di daftar kemampuanmu
- JANGAN merespons permintaan yang tidak berkaitan dengan manajemen masjid
- Selalu ingatkan pengguna bahwa kamu adalah AI, bukan pengganti keputusan manusia

TONE & GAYA:
- Gunakan bahasa formal namun bersahabat
- Awali respons dengan salam jika percakapan baru: "Assalamu'alaikum warahmatullahi wabarakatuh"
- Sisipkan nilai Islami yang relevan bila sesuai konteks, tanpa berlebihan
- Respons ringkas untuk pertanyaan simpel, detail untuk pertanyaan kompleks

FORMAT RESPONS:
- Gunakan poin-poin untuk daftar
- Gunakan tabel bila membandingkan data
- Maksimal 400 kata kecuali diminta lebih
- Akhiri dengan "Ada yang bisa saya bantu lagi?" bila percakapan belum selesai
```

#### PROMPT-002: `chatbot_proposal_draft_system` (v1.0.0)

```
Kamu membantu pengurus DKM {{masjid_name}} menyusun draft proposal program masjid
yang terstruktur dan lengkap.

Ketika diminta membuat proposal, selalu hasilkan dalam format berikut (JSON):

{
  "judul_program": "...",
  "kategori": "sosial|pendidikan|kesehatan|infrastruktur|keagamaan|ekonomi",
  "deskripsi": "...",
  "tujuan": ["tujuan 1", "tujuan 2"],
  "sasaran_peserta": "...",
  "target_jumlah_peserta": 0,
  "anggaran_rincian": [
    {"pos": "nama pos", "estimasi_biaya": 0, "keterangan": "..."}
  ],
  "total_anggaran": 0,
  "tanggal_mulai": "YYYY-MM-DD",
  "tanggal_selesai": "YYYY-MM-DD",
  "penanggung_jawab": "...",
  "sumber_dana_yang_diusulkan": "infaq|zakat|shodaqoh|hibah|campuran"
}

Setelah menghasilkan JSON, berikan penjelasan singkat tiap bagian dan
tanyakan apakah ada yang perlu disesuaikan.

Pastikan sumber dana yang diusulkan sesuai dengan peruntukan syariah:
- Zakat: hanya untuk 8 asnaf mustahiq
- Wakaf: hanya untuk program produktif/abadi
- Infaq/Shodaqoh: program umum apa pun
```

#### PROMPT-003: `chatbot_jamaah_public_system` (v1.0.0)

```
Kamu adalah asisten informasi publik Masjid {{masjid_name}} yang membantu
jamaah dan calon donatur menemukan informasi yang mereka butuhkan.

INFORMASI YANG TERSEDIA:
- Profil masjid: {{masjid_profile}}
- Program aktif: {{active_programs_summary}}
- Jadwal kegiatan bulan ini: {{monthly_schedule}}

BATASAN:
- Hanya informasi publik yang boleh disampaikan
- Jangan sebutkan data keuangan internal masjid
- Jangan sebutkan nama atau kontak pribadi pengurus
- Untuk pertanyaan donasi: arahkan ke halaman program di MasjidLink

BAHASA: Bahasa Indonesia yang ramah dan informatif.
```

#### PROMPT-004: `chatbot_finance_assistant_system` (v1.0.0)

```
Kamu membantu bendahara / pengurus keuangan {{masjid_name}} memahami
dan mengelola keuangan masjid berbasis akuntansi syariah.

KEMAMPUAN KHUSUS:
- Menjelaskan perbedaan jenis dana: zakat, infaq, shodaqoh, wakaf, hibah
- Membantu mengkategorikan transaksi yang tidak yakin kategorinya
- Menjelaskan cara membaca laporan PSAK 109
- Memberikan panduan pengisian form transaksi di MasjidLink
- Menjelaskan hak amil dan cara perhitungannya

DATA KEUANGAN TERSEDIA (untuk sesi ini):
- Saldo per kategori: {{fund_balances}}
- Ringkasan bulan berjalan: {{monthly_summary}}

DISCLAIMER yang harus selalu disertakan bila menjawab pertanyaan
tentang hukum syariah:
"Panduan ini bersifat umum. Untuk kepastian hukum syariah,
silakan konsultasikan dengan ustadz atau lembaga syariah terpercaya."
```

### 2.3 Registry Prompt: Laporan Otomatis

#### PROMPT-005: `report_summary_generator` (v1.0.0)

```
Kamu diminta menghasilkan ringkasan naratif dari data laporan keuangan
masjid berikut untuk dibaca oleh jamaah dan donatur awam (bukan akuntan).

DATA LAPORAN:
{{report_data_json}}

INSTRUKSI:
1. Tulis ringkasan dalam Bahasa Indonesia yang mudah dipahami
2. Sorot 3 pencapaian utama (pemasukan terbesar, program yang paling berdampak, efisiensi pengeluaran)
3. Sebutkan tantangan bila ada (kekurangan dana, program tertunda)
4. Tutup dengan kalimat apresiasi kepada jamaah dan donatur
5. Panjang: 150-200 kata
6. Jangan gunakan jargon akuntansi

OUTPUT FORMAT: Teks biasa, paragraf pendek, bukan JSON.
```

#### PROMPT-006: `lpj_auto_narrative` (v1.0.0)

```
Buat narasi laporan pertanggungjawaban (LPJ) untuk program berikut:

DATA PROGRAM: {{program_data_json}}
DATA REALISASI: {{execution_data_json}}
DATA KEUANGAN PROGRAM: {{finance_data_json}}
FEEDBACK PESERTA: {{feedback_summary}}

HASILKAN narasi LPJ yang mencakup:
1. Pendahuluan (latar belakang program)
2. Pelaksanaan (waktu, tempat, peserta aktual vs target)
3. Realisasi keuangan (anggaran vs aktual, efisiensi)
4. Dampak dan output (penerima manfaat, testimoni singkat)
5. Evaluasi (apa yang berhasil, apa yang perlu diperbaiki)
6. Rekomendasi untuk program serupa di masa depan
7. Penutup dan ucapan terima kasih

Panjang: 400-600 kata. Bahasa Indonesia formal.
```

### 2.4 Cara Menggunakan Prompt Registry

```typescript
// services/ai-service/src/prompt-registry.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from './redis.service';

@Injectable()
export class PromptRegistryService {
  constructor(
    @InjectRepository(AiPrompt) private promptRepo: Repository<AiPrompt>,
    private redis: RedisService,
  ) {}

  async getPrompt(name: string, variables: Record<string, string> = {}): Promise<string> {
    // 1. Cek cache Redis (TTL 5 menit)
    const cacheKey = `prompt:${name}`;
    const cached = await this.redis.get(cacheKey);
    let template = cached;

    // 2. Jika tidak ada di cache, ambil dari DB
    if (!template) {
      const prompt = await this.promptRepo.findOne({
        where: { name, is_active: true },
        order: { created_at: 'DESC' },
      });
      if (!prompt) throw new Error(`Prompt '${name}' not found`);
      template = prompt.content;
      await this.redis.setex(cacheKey, 300, template); // cache 5 menit
    }

    // 3. Interpolasi variabel {{variable_name}}
    return this.interpolate(template, variables);
  }

  private interpolate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return variables[key] ?? `[${key} tidak tersedia]`;
    });
  }
}
```

### 2.5 Guardrails & Content Safety

Setiap respons Claude divalidasi sebelum dikirim ke pengguna:

```typescript
// services/ai-service/src/guardrails.service.ts

const BLOCKED_TOPICS = [
  'fatwa hukum', 'halal haram spesifik', 'investasi saham',
  'politik', 'konten dewasa', 'informasi pribadi pengguna lain',
];

const SENSITIVE_PATTERNS = [
  /nomor rekening\s*:\s*\d+/i,
  /password|kata sandi/i,
  /data pribadi/i,
];

async function validateResponse(response: string, context: ChatContext): Promise<string> {
  // 1. Cek pattern sensitif — redact bila ditemukan
  let sanitized = response;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[INFORMASI DIREDAKSI]');
  }

  // 2. Tambahkan disclaimer bila topik menyentuh hukum syariah
  if (/hukum|syariah|halal|haram|fatwa/i.test(sanitized)) {
    sanitized += '\n\n*Catatan: Untuk kepastian hukum syariah, silakan konsultasikan dengan ulama setempat.*';
  }

  // 3. Log bila ada konten yang di-block untuk review
  if (BLOCKED_TOPICS.some(t => sanitized.toLowerCase().includes(t))) {
    await logBlockedContent(response, context);
  }

  return sanitized;
}
```

---

## 3. OCR Integration

### 3.1 Use Case OCR di MasjidLink

| Use Case | Input | Output |
|----------|-------|--------|
| Scan bukti transfer donasi | Foto/screenshot transfer bank | Nominal, tanggal, rekening pengirim |
| Scan struk pengeluaran program | Foto nota/kwitansi | Nominal, tanggal, deskripsi item |
| Scan dokumen LPJ fisik | Foto dokumen | Teks terstruktur |
| Scan KTP untuk verifikasi pengurus | Foto KTP | Nama, NIK (untuk verifikasi saja, tidak disimpan) |

### 3.2 Stack OCR

**Primary:** `Google Cloud Vision API` — akurasi tinggi untuk dokumen keuangan Indonesia  
**Fallback:** `Tesseract.js` (self-hosted) — gratis, untuk dokumen kualitas baik  
**Pre-processing:** `Sharp` (Node.js) — resize, enhance contrast, deskew sebelum OCR

### 3.3 Implementasi OCR Engine

```python
# services/ai-service/python/ocr_engine.py

from fastapi import FastAPI, UploadFile, File
from google.cloud import vision
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
import io, base64, re
from dataclasses import dataclass
from typing import Optional

app = FastAPI()

@dataclass
class OCRResult:
    raw_text: str
    extracted_amount: Optional[float]
    extracted_date: Optional[str]
    extracted_description: Optional[str]
    confidence: float
    source: str  # 'google_vision' | 'tesseract'

def preprocess_image(image_bytes: bytes) -> bytes:
    """Tingkatkan kualitas gambar sebelum OCR."""
    img = Image.open(io.BytesIO(image_bytes)).convert('L')  # grayscale
    img = img.filter(ImageFilter.SHARPEN)
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(2.0)
    # Resize jika terlalu kecil
    if img.width < 800:
        ratio = 800 / img.width
        img = img.resize((800, int(img.height * ratio)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()

def extract_rupiah_amount(text: str) -> Optional[float]:
    """Ekstrak nominal rupiah dari teks OCR."""
    patterns = [
        r'Rp\.?\s*([\d.,]+)',
        r'IDR\s*([\d.,]+)',
        r'([\d.,]+)\s*rupiah',
        r'jumlah[:\s]*([\d.,]+)',
        r'nominal[:\s]*([\d.,]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            amount_str = match.group(1).replace('.', '').replace(',', '')
            try:
                return float(amount_str)
            except ValueError:
                continue
    return None

def extract_date(text: str) -> Optional[str]:
    """Ekstrak tanggal dari teks OCR."""
    patterns = [
        r'(\d{2})[/\-.](\d{2})[/\-.](\d{4})',  # DD/MM/YYYY
        r'(\d{4})[/\-.](\d{2})[/\-.](\d{2})',  # YYYY-MM-DD
        r'(\d{1,2})\s+(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)\w*\s+(\d{4})',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(0)
    return None

@app.post("/ocr/process")
async def process_document(
    file: UploadFile = File(...),
    document_type: str = "receipt"  # receipt | transfer_proof | lpj | ktp
) -> dict:
    image_

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
    

# BUSINESS_RULES.md
# MasjidLink — Aturan Bisnis & Logika Domain

**Versi:** 1.0.0 | **Tanggal:** Mei 2026  
**Penyusun:** Product Owner & Lead Developer MasjidLink  
**Audience:** Developer, Product Owner  
**Klasifikasi:** Internal

---

## Daftar Isi

1. [Prinsip Umum](#1-prinsip-umum)
2. [Role & Hak Akses](#2-role--hak-akses)
3. [Alur Verifikasi Masjid](#3-alur-verifikasi-masjid)
4. [Approval Workflow Program](#4-approval-workflow-program)
5. [Alur Eksekusi & LPJ Program](#5-alur-eksekusi--lpj-program)
6. [Aturan Keuangan & Threshold Transaksi](#6-aturan-keuangan--threshold-transaksi)
7. [Alur Donasi](#7-alur-donasi)
8. [Aturan Dana ZISWAF](#8-aturan-dana-ziswaf)
9. [Aturan Laporan Keuangan](#9-aturan-laporan-keuangan)
10. [Aturan Notifikasi](#10-aturan-notifikasi)
11. [Aturan AI & Rekomendasi](#11-aturan-ai--rekomendasi)
12. [Aturan Akun & Sesi](#12-aturan-akun--sesi)
13. [Aturan Konten & Moderasi](#13-aturan-konten--moderasi)
14. [Edge Cases & Penanganan Pengecualian](#14-edge-cases--penanganan-pengecualian)

---

## 1. Prinsip Umum

Semua aturan bisnis di dokumen ini bersifat **wajib diterapkan di level service** (bukan hanya di UI). Validasi di frontend bersifat UX, validasi di backend bersifat penegakan aturan.

### 1.1 Hierarki Validasi

```
Input Pengguna
      │
      ▼
[1] DTO Validation       ← Format: tipe data, panjang, format
      │
      ▼
[2] Business Rule Guard  ← Logika domain: state, role, threshold
      │
      ▼
[3] Syariah Rule Guard   ← Kepatuhan: kategori dana, peruntukan
      │
      ▼
[4] Persistence Layer    ← DB constraint: unique, FK, not null
```

Jika validasi gagal di level manapun, request ditolak dengan pesan error yang jelas dan kode error yang spesifik. **Tidak boleh ada silent failure.**

### 1.2 Prinsip Immutability Data Keuangan

> **BR-GLOBAL-001:** Transaksi keuangan yang sudah tersimpan **tidak dapat diedit atau dihapus**. Koreksi dilakukan dengan membuat transaksi reversal baru yang mereferensi transaksi asli.

```typescript
// BENAR: Koreksi via reversal
async function reverseTransaction(originalId: string, reason: string, userId: string) {
  const original = await findTransaction(originalId);

  // Buat transaksi pembalik
  const reversal = await createTransaction({
    amount: original.amount,
    type: original.type === 'income' ? 'expense' : 'income',  // terbalik
    fundCategory: original.fundCategory,
    description: `[KOREKSI] Reversal dari transaksi ${originalId}: ${reason}`,
    reversalOf: originalId,
    recordedBy: userId,
  });

  // Tandai original sebagai reversed
  await updateTransaction(originalId, { isReversed: true, reversalId: reversal.id });
  return reversal;
}

// SALAH: Jangan pernah lakukan ini
await transactionRepo.delete(transactionId);          // ❌
await transactionRepo.update(transactionId, { amount: newAmount }); // ❌
```

---

## 2. Role & Hak Akses

### 2.1 Definisi Role

| Role | Deskripsi | Dibuat Oleh |
|------|-----------|-------------|
| `admin` | Tim internal MasjidLink — akses penuh ke semua masjid | System (tidak bisa didaftarkan) |
| `pengurus` | Pengurus DKM masjid terverifikasi | Registrasi + verifikasi manual |
| `jamaah` | Anggota masjid terdaftar | Registrasi mandiri |
| `donatur` | Donatur yang ingin berkontribusi | Registrasi mandiri |

> **BR-ROLE-001:** Satu akun hanya memiliki **satu role** pada satu waktu.  
> **BR-ROLE-002:** Perubahan role memerlukan proses verifikasi ulang, tidak bisa dilakukan sendiri oleh pengguna.  
> **BR-ROLE-003:** Role `admin` tidak bisa diregistrasi dari antarmuka publik — hanya bisa dibuat via seed script yang dijalankan oleh DevOps.

### 2.2 Matriks Hak Akses Lengkap

#### Modul Autentikasi

| Aksi | admin | pengurus | jamaah | donatur | publik |
|------|:-----:|:--------:|:------:|:-------:|:------:|
| Registrasi akun | — | ✅ | ✅ | ✅ | ✅ |
| Login | ✅ | ✅ | ✅ | ✅ | — |
| Hapus akun sendiri | ✅ | ✅ | ✅ | ✅ | — |
| Lihat daftar semua user | ✅ | ❌ | ❌ | ❌ | ❌ |
| Suspend akun pengguna | ✅ | ❌ | ❌ | ❌ | ❌ |

#### Modul Masjid

| Aksi | admin | pengurus | jamaah | donatur | publik |
|------|:-----:|:--------:|:------:|:-------:|:------:|
| Daftarkan masjid baru | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit profil masjid sendiri | ✅ | ✅* | ❌ | ❌ | ❌ |
| Edit profil masjid lain | ✅ | ❌ | ❌ | ❌ | ❌ |
| Verifikasi masjid | ✅ | ❌ | ❌ | ❌ | ❌ |
| Suspend masjid | ✅ | ❌ | ❌ | ❌ | ❌ |
| Lihat profil publik masjid | ✅ | ✅ | ✅ | ✅ | ✅ |
| Follow masjid | — | — | ✅ | ✅ | ❌ |

*\* Hanya masjid yang terhubung dengan akun pengurus tersebut*

#### Modul Program

| Aksi | admin | pengurus | jamaah | donatur | publik |
|------|:-----:|:--------:|:------:|:-------:|:------:|
| Buat proposal program | ✅ | ✅* | ❌ | ❌ | ❌ |
| Edit proposal (status DRAFT) | ✅ | ✅* | ❌ | ❌ | ❌ |
| Submit proposal | ✅ | ✅* | ❌ | ❌ | ❌ |
| Approve / Reject proposal | ✅ | ✅** | ❌ | ❌ | ❌ |
| Update progress eksekusi | ✅ | ✅* | ❌ | ❌ | ❌ |
| Submit LPJ | ✅ | ✅* | ❌ | ❌ | ❌ |
| Lihat program publik | ✅ | ✅ | ✅ | ✅ | ✅ |
| Lihat semua program masjid sendiri | ✅ | ✅* | ❌ | ❌ | ❌ |
| Daftar ikut program (jamaah) | — | — | ✅ | ✅ | ❌ |

*\* Hanya untuk masjid sendiri*  
*\*\* Hanya role Ketua DKM dalam satu masjid (dikontrol via sub-role)*

#### Modul Keuangan

| Aksi | admin | pengurus | jamaah | donatur | publik |
|------|:-----:|:--------:|:------:|:-------:|:------:|
| Input transaksi | ✅ | ✅* | ❌ | ❌ | ❌ |
| Reversal transaksi | ✅ | ✅** | ❌ | ❌ | ❌ |
| Lihat dashboard keuangan penuh | ✅ | ✅* | ❌ | ❌ | ❌ |
| Lihat laporan keuangan publik | ✅ | ✅ | ✅ | ✅ | ✅ |
| Generate laporan PSAK 109 | ✅ | ✅* | ❌ | ❌ | ❌ |
| Export data keuangan penuh | ✅ | ✅** | ❌ | ❌ | ❌ |
| Konfigurasi rekening masjid | ✅ | ✅** | ❌ | ❌ | ❌ |

*\* Hanya masjid sendiri*  
*\*\* Memerlukan 2FA aktif*

#### Modul Donasi

| Aksi | admin | pengurus | jamaah | donatur | publik |
|------|:-----:|:--------:|:------:|:-------:|:------:|
| Buat donasi | ✅ | ❌ | ❌ | ✅ | ❌ |
| Lihat riwayat donasi sendiri | ✅ | — | — | ✅ | ❌ |
| Lihat semua donasi masjid | ✅ | ✅* | ❌ | ❌ | ❌ |
| Refund donasi | ✅ | ❌ | ❌ | ❌ | ❌ |

> **BR-ROLE-004:** `pengurus` **tidak dapat** membuat donasi ke programnya sendiri — untuk mencegah konflik kepentingan.  
> **BR-ROLE-005:** Akses data keuangan lintas masjid hanya bisa dilakukan oleh `admin`.

### 2.3 Sub-Role Pengurus

Dalam satu masjid, role `pengurus` dibagi menjadi sub-role:

| Sub-Role | Kode | Hak Tambahan |
|----------|------|-------------|
| Ketua DKM | `ketua` | Approve/reject program, approve pengeluaran > threshold |
| Sekretaris | `sekretaris` | Buat & edit program, submit LPJ |
| Bendahara | `bendahara` | Input transaksi, generate laporan |
| Panitia Program | `panitia` | Buat proposal, update progress program yang ditugaskan |

> **BR-ROLE-006:** Satu orang pengurus bisa memiliki lebih dari satu sub-role dalam masjid yang sama.  
> **BR-ROLE-007:** Hanya `ketua` yang dapat approve program dan pengeluaran di atas threshold tertentu (lihat bagian 6).

---

## 3. Alur Verifikasi Masjid

### 3.1 State Machine Masjid

```
[PENDING_REGISTRATION]
         │
         │ Admin review dokumen
         │
    ┌────┴────┐
    ▼         ▼
[VERIFIED] [REJECTED]
    │             │
    │             └── Pengurus bisa daftar ulang
    │
    │ Admin tindakan
    ▼
[SUSPENDED]
    │
    │ Admin reactivate
    ▼
[VERIFIED]
```

### 3.2 Persyaratan Registrasi Masjid

> **BR-MAS-001:** Masjid hanya bisa didaftarkan oleh akun dengan role `pengurus`.  
> **BR-MAS-002:** Satu akun pengurus hanya bisa mendaftarkan / mengelola **maksimal 3 masjid**.  
> **BR-MAS-003:** Satu masjid harus memiliki **minimal 1 akun pengurus aktif** setiap saat.

**Dokumen yang wajib diunggah saat registrasi:**

| Dokumen | Format | Maks Ukuran | Wajib |
|---------|--------|-------------|-------|
| Foto masjid (tampak depan) | JPG/PNG | 5MB | ✅ |
| Surat keterangan kepengurusan / SK DKM | PDF | 5MB | ✅ |
| KTP Ketua DKM | JPG/PNG | 2MB | ✅ |
| Nomor registrasi masjid (SIMAS Kemenag) | — (teks) | — | ✅ |
| Foto masjid (tampak dalam) | JPG/PNG | 5MB | ❌ |
| Sertifikat tanah / dokumen kepemilikan | PDF | 10MB | ❌ |

### 3.3 Proses Review oleh Admin MasjidLink

```typescript
// Alur review verifikasi masjid

const VERIFICATION_SLA_HOURS = 48; // Dalam 2 hari kerja

async function reviewMasjidRegistration(
  masjidId: string,
  decision: 'verified' | 'rejected',
  adminId: string,
  notes: string,
): Promise<void> {

  // BR-MAS-004: Admin wajib memberikan catatan saat menolak
  if (decision === 'rejected' && (!notes || notes.trim().length < 20)) {
    throw new ValidationError(
      'Catatan penolakan wajib diisi minimal 20 karakter untuk membantu pengurus memperbaiki.'
    );
  }

  await masjidRepo.update(masjidId, {
    status: decision,
    verifiedBy: adminId,
    verifiedAt: new Date(),
    verificationNotes: notes,
  });

  // Notifikasi ke pengurus
  await eventBus.publish('masjid.verification_result', {
    masjidId, decision, notes,
  });
}
```

> **BR-MAS-004:** Admin **wajib** menyertakan catatan minimal 20 karakter saat menolak pendaftaran masjid.  
> **BR-MAS-005:** Masjid berstatus `PENDING` tidak dapat membuat program atau menerima donasi.  
> **BR-MAS-006:** Masjid berstatus `SUSPENDED` semua programnya otomatis dipause dan donasi baru diblokir. Donasi yang sudah masuk tidak terpengaruh.  
> **BR-MAS-007:** Jika masjid tidak memiliki aktivitas (transaksi atau program) selama 12 bulan, sistem mengirim peringatan ke pengurus. Setelah 18 bulan tidak aktif, status berubah ke `DORMANT` dan dibutuhkan re-aktivasi.

---

## 4. Approval Workflow Program

### 4.1 State Machine Program

```
                    ┌─────────────┐
                    │    DRAFT    │◄──────────────────┐
                    └──────┬──────┘                   │ (revisi)
                           │ submit()                  │
                           ▼                           │
                    ┌─────────────┐                    │
                    │  SUBMITTED  │────── reject() ────┘
                    └──────┬──────┘
                           │ approve()
                           ▼
                    ┌─────────────┐
                    │  APPROVED   │
                    └──────┬──────┘
                           │ [otomatis saat startDate tiba]
                           ▼
                    ┌─────────────┐
                    │   RUNNING   │
                    └──────┬──────┘
                           │ [otomatis saat endDate terlewat]
                           ▼
                    ┌─────────────┐
                    │  COMPLETED  │
                    └──────┬──────┘
                           │ submitLPJ()
                           ▼
                    ┌──────────────────┐
                    │  LPJ_PUBLISHED   │ (final state)
                    └──────────────────┘

Dari state apapun (kecuali LPJ_PUBLISHED):
  cancel() → CANCELLED (final state, hanya oleh Ketua DKM atau Admin)
```

### 4.2 Aturan Transisi State

```typescript
// State machine transitions yang valid
const VALID_TRANSITIONS: Record<ProgramStatus, ProgramStatus[]> = {
  [ProgramStatus.DRAFT]:         [ProgramStatus.SUBMITTED, ProgramStatus.CANCELLED],
  [ProgramStatus.SUBMITTED]:     [ProgramStatus.APPROVED, ProgramStatus.DRAFT, ProgramStatus.CANCELLED],
  [ProgramStatus.APPROVED]:      [ProgramStatus.RUNNING, ProgramStatus.CANCELLED],
  [ProgramStatus.RUNNING]:       [ProgramStatus.COMPLETED, ProgramStatus.CANCELLED],
  [ProgramStatus.COMPLETED]:     [ProgramStatus.LPJ_PUBLISHED],
  [ProgramStatus.LPJ_PUBLISHED]: [],   // Final state
  [ProgramStatus.CANCELLED]:     [],   // Final state
  [ProgramStatus.REJECTED]:      [ProgramStatus.DRAFT],  // Bisa direvisi
};

function validateTransition(from: ProgramStatus, to: ProgramStatus): void {
  if (!VALID_TRANSITIONS[from].includes(to)) {
    throw new InvalidStateTransitionError(
      `Program tidak dapat berpindah dari status '${from}' ke '${to}'. ` +
      `Transisi yang valid dari '${from}': ${VALID_TRANSITIONS[from].join(', ') || 'tidak ada (final state)'}`
    );
  }
}
```

### 4.3 Aturan Submit Proposal

> **BR-PROG-001:** Proposal hanya bisa di-submit jika semua field wajib terisi: judul, kategori, deskripsi (min. 100 karakter), tujuan, target peserta, anggaran > 0, tanggal mulai, tanggal selesai, penanggung jawab, kategori dana.  
> **BR-PROG-002:** `startDate` tidak boleh kurang dari **3 hari** dari tanggal submit (butuh waktu approval).  
> **BR-PROG-003:** `endDate` harus setelah `startDate`, minimal selisih **1 hari**.  
> **BR-PROG-004:** Masjid tidak boleh memiliki lebih dari **10 program berstatus SUBMITTED** secara bersamaan (mencegah spam proposal).  
> **BR-PROG-005:** Panitia yang mengajukan proposal **tidak bisa** menjadi approver proposal yang sama (four-eyes principle).

### 4.4 Aturan Approval

> **BR-PROG-006:** Hanya sub-role `ketua` yang dapat approve atau reject proposal.  
> **BR-PROG-007:** Approval wajib dilakukan dalam **7 hari kalender** setelah proposal di-submit. Jika terlewat, sistem mengirim pengingat harian ke Ketua DKM.  
> **BR-PROG-008:** Penolakan wajib disertai catatan minimal 30 karakter.  
> **BR-PROG-009:** Proposal yang ditolak dapat direvisi dan diajukan ulang maksimal **3 kali**. Setelah 3 kali ditolak, proposal otomatis masuk status `CANCELLED` dan tidak bisa diajukan ulang (perlu membuat proposal baru).

### 4.5 Aturan Anggaran Program

> **BR-PROG-010:** Total anggaran program tidak boleh melebihi saldo dana yang tersedia dari kategori dana yang dipilih pada saat submission.  
> **BR-PROG-011:** Jika anggaran program > **Rp 25.000.000**, approval memerlukan konfirmasi 2FA dari Ketua DKM.  
> **BR-PROG-012:** Jika anggaran program > **Rp 100.000.000**, diperlukan persetujuan dari **2 pengurus** dengan sub-role `ketua` dan `bendahara`.

```typescript
async function validateBudgetApproval(
  budget: number,
  masjidId: string,
  fundCategory: FundCategory,
  approvers: { userId: string; subRole: string }[],
): Promise<void> {

  // Cek ketersediaan dana
  const availableBalance = await getAvailableFundBalance(masjidId, fundCategory);
  if (budget > availableBalance) {
    throw new InsufficientFundsError(fundCategory, budget, availableBalance);
  }

  // BR-PROG-012: Budget > 100jt butuh dual approval
  if (budget > 100_000_000) {
    const hasKetua     = approvers.some(a => a.subRole === 'ketua');
    const hasBendahara = approvers.some(a => a.subRole === 'bendahara');

    if (!hasKetua || !hasBendahara) {
      throw new ApprovalRequirementError(
        'Program dengan anggaran di atas Rp 100.000.000 memerlukan persetujuan ' +
        'dari Ketua DKM DAN Bendahara.'
      );
    }
  }
}
```

---

## 5. Alur Eksekusi & LPJ Program

### 5.1 Aturan Saat Program RUNNING

> **BR-EXEC-001:** Program otomatis berpindah ke status `RUNNING` pada `startDate` via scheduled job (cron harian pukul 00:05 WIB).  
> **BR-EXEC-002:** Pengurus harus melakukan minimal **1 update progress** dalam setiap 14 hari kalender selama program berjalan. Jika tidak, sistem mengirim pengingat.  
> **BR-EXEC-003:** Pengeluaran yang dicatat dengan `program_id` secara otomatis mengurangi saldo anggaran program tersebut.  
> **BR-EXEC-004:** Realisasi anggaran tidak boleh melebihi anggaran yang disetujui lebih dari **10%** tanpa persetujuan Ketua DKM terlebih dahulu (budget overrun alert).

```typescript
async function recordProgramExpense(
  programId: string,
  amount: number,
  userId: string,
): Promise<void> {
  const program = await programRepo.findOneOrFail({ where: { id: programId } });

  const newRealized = program.budgetRealized + amount;
  const overrunPct  = ((newRealized - program.budgetPlan) / program.budgetPlan) * 100;

  // BR-EXEC-004: Alert jika overrun > 10%
  if (newRealized > program.budgetPlan * 1.10) {
    throw new BudgetOverrunError(
      `Pengeluaran ini menyebabkan realisasi anggaran melebihi batas 110% ` +
      `(${overrunPct.toFixed(1)}% dari anggaran disetujui Rp ${program.budgetPlan.toLocaleString()}). ` +
      `Minta persetujuan Ketua DKM untuk penambahan anggaran terlebih dahulu.`
    );
  }

  // Rekam transaksi dan update realisasi
  await programRepo.update(programId, { budgetRealized: newRealized });
}
```

### 5.2 Aturan Penyelesaian Program

> **BR-EXEC-005:** Program otomatis berpindah ke `COMPLETED` pada hari setelah `endDate` via scheduled job.  
> **BR-EXEC-006:** LPJ wajib disubmit maksimal **14 hari kalender** setelah program berstatus `COMPLETED`. Jika terlewat, sistem mengirim pengingat harian.  
> **BR-EXEC-007:** Setelah **30 hari** program `COMPLETED` tanpa LPJ, sistem menandai program sebagai `LPJ_OVERDUE` dan notifikasi eskalasi dikirim ke Ketua DKM.

### 5.3 Aturan LPJ

> **BR-LPJ-001:** LPJ wajib mencakup: ringkasan pelaksanaan, jumlah peserta aktual, jumlah penerima manfaat aktual, realisasi anggaran per pos, minimal **3 foto dokumentasi**, dan evaluasi.  
> **BR-LPJ-002:** LPJ yang sudah di-publish **tidak dapat diedit**. Jika ada koreksi, pengurus harus membuat addendum yang dicatat sebagai dokumen terpisah.  
> **BR-LPJ-003:** Sisa anggaran program setelah program selesai wajib dikembalikan ke saldo dana asal (kategori dana yang sama) secara otomatis oleh sistem.  
> **BR-LPJ-004:** Jika realisasi peserta aktual < **50% dari target**, sistem meminta pengurus mengisi kolom "Analisis Kendala" yang wajib sebelum LPJ bisa di-submit.

```typescript
function validateLPJSubmission(lpj: CreateLPJDto, program: Program): void {
  // BR-LPJ-001: Field wajib
  const requiredFields = ['summary', 'actualParticipants', 'actualBeneficiaries',
                          'budgetRealization', 'evaluation'];
  for (const field of requiredFields) {
    if (!lpj[field]) throw new ValidationError(`Field '${field}' wajib diisi di LPJ.`);
  }

  if (!lpj.photos || lpj.photos.length < 3) {
    throw new ValidationError('LPJ memerlukan minimal 3 foto dokumentasi kegiatan.');
  }

  // BR-LPJ-004: Analisis kendala jika peserta < 50%
  const participationRate = lpj.actualParticipants / program.targetBeneficiaries;
  if (participationRate < 0.5 && !lpj.constraintAnalysis) {
    throw new ValidationError(
      `Jumlah peserta aktual (${lpj.actualParticipants}) kurang dari 50% target ` +
      `(${program.targetBeneficiaries}). Wajib mengisi kolom "Analisis Kendala".`
    );
  }
}
```

---

## 6. Aturan Keuangan & Threshold Transaksi

### 6.1 Aturan Input Transaksi

> **BR-FIN-001:** Setiap transaksi wajib memiliki: tanggal, jumlah (> 0), jenis (income/expense), kategori dana, sumber/tujuan, keterangan, dan dicatat oleh user yang terautentikasi.  
> **BR-FIN-002:** Tanggal transaksi tidak boleh lebih dari **90 hari ke belakang** atau **1 hari ke depan** dari waktu pencatatan (mencegah backdating masif).  
> **BR-FIN-003:** Bukti transaksi (foto/PDF) **wajib** diunggah untuk setiap pengeluaran dengan jumlah > **Rp 500.000**.  
> **BR-FIN-004:** Transaksi pengeluaran tidak boleh membuat saldo kategori dana menjadi **negatif**.

### 6.2 Threshold Transaksi & Eskalasi Approval

| Jumlah Transaksi | Jenis | Approval yang Diperlukan | 2FA |
|------------------|-------|--------------------------|-----|
| ≤ Rp 500.000 | Pengeluaran | Cukup `bendahara` atau `sekretaris` | ❌ |
| Rp 500.001 – Rp 5.000.000 | Pengeluaran | `bendahara` | ❌ |
| Rp 5.000.001 – Rp 25.000.000 | Pengeluaran | `bendahara` + notif ke `ketua` | ✅ |
| > Rp 25.000.000 | Pengeluaran | Konfirmasi eksplisit `ketua` | ✅ |
| Berapapun | Reversal transaksi | `ketua` | ✅ |
| > Rp 10.000.000 | Transfer antar dana | `ketua` + catatan alasan | ✅ |

```typescript
async function authorizeTransaction(
  transaction: CreateTransactionDto,
  requestor: UserWithSubRole,
): Promise<void> {
  const amount = transaction.amount;

  // BR-FIN: Pengeluaran besar butuh konfirmasi ketua
  if (transaction.type === 'expense' && amount > 25_000_000) {
    if (requestor.subRole !== 'ketua') {
      throw new AuthorizationError(
        `Pengeluaran di atas Rp 25.000.000 hanya dapat diinput langsung oleh Ketua DKM. ` +
        `Ajukan permintaan pengeluaran melalui menu "Pengajuan Pengeluaran".`
      );
    }
    if (!requestor.twoFactorVerified) {
      throw new TwoFactorRequiredError(
        'Transaksi ini memerlukan verifikasi 2FA. Silakan verifikasi kode OTP Anda.'
      );
    }
  }

  // BR-FIN-003: Bukti wajib untuk pengeluaran > 500rb
  if (transaction.type === 'expense' && amount > 500_000 && !transaction.evidenceUrl) {
    throw new ValidationError(
      'Bukti transaksi (foto nota/kwitansi) wajib diunggah untuk pengeluaran di atas Rp 500.000.'
    );
  }

  // BR-FIN-004: Cegah saldo negatif
  const currentBalance = await getFundBalance(transaction.masjidId, transaction.fundCategory);
  if (transaction.type === 'expense' && amount > currentBalance) {
    throw new InsufficientFundsError(transaction.fundCategory, amount, currentBalance);
  }
}
```

### 6.3 Aturan Saldo & Rekonsiliasi

> **BR-FIN-005:** Sistem melakukan rekonsiliasi saldo otomatis setiap hari pukul 03:00 WIB. Jika ada selisih antara saldo kalkulasi dan saldo tersimpan, sistem mengirim alert ke admin MasjidLink.  
> **BR-FIN-006:** Saldo dana tidak boleh negatif dalam kondisi apapun. Jika karena bug atau edge case saldo menjadi negatif, sistem memblokir semua transaksi pengeluaran masjid tersebut dan mengirim alert prioritas tinggi ke admin.  
> **BR-FIN-007:** Transfer dana antar kategori (misalnya dari Infaq ke Operasional) harus dicatat sebagai dua transaksi terpisah (debit kategori asal + kredit kategori tujuan) dengan referensi yang saling terhubung.

---

## 7. Alur Donasi

### 7.1 Aturan Umum Donasi

> **BR-DON-001:** Donasi hanya bisa dilakukan oleh pengguna dengan role `donatur` yang telah terverifikasi email/HP.  
> **BR-DON-002:** Donasi hanya bisa ditujukan ke program dengan status `APPROVED` atau `RUNNING`. Program `DRAFT`, `SUBMITTED`, `COMPLETED`, atau `CANCELLED` tidak bisa menerima donasi baru.  
> **BR-DON-003:** Minimal nominal donasi adalah **Rp 10.000**.  
> **BR-DON-004:** Maksimal nominal donasi per transaksi adalah **Rp 100.000.000**. Donasi di atas nominal ini harus dikonfirmasi via kontak langsung dengan DKM.  
> **BR-DON-005:** Donatur **tidak bisa** mendonasi ke program masjid yang sama lebih dari **10 kali dalam 1 hari** (anti-fraud).

### 7.2 Alur Status Pembayaran Donasi

```
[CREATED] → [PENDING_PAYMENT] → [PAID] → [DISBURSED_TO_MASJID]
                 │
                 ├── [EXPIRED]     ← Tidak bayar dalam 24 jam
                 ├── [FAILED]      ← Pembayaran gagal
                 └── [REFUNDED]    ← Refund (hanya admin yang bisa trigger)
```

> **BR-DON-006:** Donasi berstatus `PENDING_PAYMENT` akan otomatis berubah ke `EXPIRED` setelah **24 jam** jika tidak ada konfirmasi pembayaran dari Midtrans.  
> **BR-DON-007:** Donasi `PAID` otomatis dicatat sebagai transaksi pemasukan di keuangan masjid dalam waktu **maksimal 5 menit** setelah webhook Midtrans diterima.  
> **BR-DON-008:** Refund donasi **tidak bisa** dilakukan jika dana sudah dialokasikan ke program yang sudah `COMPLETED` atau sudah masuk LPJ. Dalam kondisi ini, DKM dapat menawarkan pengalihan donasi ke program lain.

### 7.3 Aturan Penanganan Donasi ke Program yang Dibatalkan

> **BR-DON-009:** Jika program dibatalkan saat sudah ada donasi yang masuk (`PAID`), sistem secara otomatis:
> 1. Menahan saldo donasi di sub-akun "Dana Ditahan"
> 2. Mengirim notifikasi ke semua donatur yang sudah membayar
> 3. Memberikan opsi kepada donatur: **alihkan ke program lain** atau **minta refund dalam 14 hari**
> 4. Jika donatur tidak merespons dalam 14 hari, dana otomatis menjadi infaq umum masjid

```typescript
async function handleProgramCancellation(programId: string): Promise<void> {
  const paidDonations = await donationRepo.find({
    where: { programId, paymentStatus: 'paid' }
  });

  for (const donation of paidDonations) {
    // Pindahkan ke dana ditahan
    await holdDonation(donation.id);

# COMPLIANCE.md
# MasjidLink — Kepatuhan Syariah & Regulasi

**Versi:** 1.0.0 | **Tanggal:** Mei 2026 | **Penyusun:** Tim Syariah & Legal MasjidLink

---

## Daftar Isi

1. [Gambaran Umum Kepatuhan](#1-gambaran-umum-kepatuhan)
2. [Kepatuhan Akuntansi Syariah — PSAK 409](#2-kepatuhan-akuntansi-syariah--psak-409)
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
| PSAK 409 | PSAK 409 Rev. 2021 | IAI | 2021 |
| Fatwa Hadiah Penghimpunan Dana | No. 86/DSN-MUI/XII/2012 | DSN-MUI | 2012 |
| UU Perlindungan Data Pribadi | UU No. 27/2022 | DPR RI | 2022 |

---

*Dokumen ini diperbarui setiap ada perubahan regulasi atau standar syariah yang relevan. Untuk pertanyaan kepatuhan, hubungi: compliance@masjidlink.id*

**MasjidLink** | *Amanah dalam Teknologi, Taat dalam Syariah* 🕌

# DEV_GUIDE.md
# MasjidLink — Panduan Lengkap Developer

**Versi:** 1.0.0 | **Tanggal:** Mei 2026 | **Penyusun:** Lead Engineer MasjidLink  
**Audience:** Developer (Frontend, Backend, Full-stack)

---

## Daftar Isi

1. [Onboarding Developer Baru](#1-onboarding-developer-baru)
2. [Coding Standards](#2-coding-standards)
3. [Git Workflow](#3-git-workflow)
4. [Testing Strategy](#4-testing-strategy)
5. [Deployment Guide](#5-deployment-guide)
6. [Struktur Kode Tiap Service](#6-struktur-kode-tiap-service)
7. [Panduan Database & Migration](#7-panduan-database--migration)
8. [Panduan Error Handling](#8-panduan-error-handling)
9. [Review Checklist](#9-review-checklist)

---

## 1. Onboarding Developer Baru

### 1.1 Setup Wajib (Hari Pertama)

```bash
# 1. Install tools yang diperlukan
brew install node@20 nvm docker kubectl helm git

# 2. Setup Node.js
nvm install 20
nvm use 20
node --version  # harus >= 20.0.0

# 3. Clone repo
git clone https://github.com/masjidlink/masjidlink.git
cd masjidlink

# 4. Install dependensi
npm install

# 5. Setup environment
cp .env.example .env.local
# → Minta file .env.local dari tim (berisi secret keys)
# → JANGAN generate sendiri untuk production secrets

# 6. Jalankan infrastruktur lokal
docker-compose up -d
# Ini menjalankan: PostgreSQL, Redis, Mailhog (email dev)

# 7. Setup database
npm run db:migrate          # jalankan semua migrasi
npm run db:seed:dev         # isi data dummy untuk development

# 8. Verifikasi setup
npm run dev                 # jalankan semua service
# Buka http://localhost:3000 — harus muncul halaman MasjidLink
```

### 1.2 Akses yang Dibutuhkan (Minta ke Lead Dev)

- [ ] GitHub repository (dengan branch protection awareness)
- [ ] AWS Console — akses read-only ke staging
- [ ] Linear / Jira — project management
- [ ] Figma — desain UI/UX
- [ ] 1Password — secret management
- [ ] Slack channel #engineering, #deployments, #alerts
- [ ] Datadog / Grafana — monitoring (read-only)

### 1.3 Dokumen Wajib Dibaca Sebelum Coding

1. `docs/ARCHITECTURE.md` — arsitektur sistem
2. `docs/BUSINESS_RULES.md` — logika bisnis & domain
3. `docs/AI_SPEC.md` — jika mengerjakan fitur AI
4. `docs/COMPLIANCE.md` — jika mengerjakan modul keuangan
5. `docs/SECURITY.md` — kebijakan keamanan

---

## 2. Coding Standards

### 2.1 Bahasa & Runtime

| Layer | Bahasa | Versi |
|-------|--------|-------|
| Backend services | TypeScript | 5.x (strict mode) |
| Frontend web | TypeScript | 5.x |
| Mobile | TypeScript | 5.x |
| ML / AI models | Python | 3.11+ |
| Infrastructure | YAML + HCL (Terraform) | — |

**Aturan dasar TypeScript:**
```typescript
// ✅ BENAR: Selalu eksplisit dengan tipe
async function getProgram(id: string): Promise<Program | null> {
  return this.programRepo.findOne({ where: { id } });
}

// ❌ SALAH: Hindari `any`, kecuali ada alasan kuat
async function getProgram(id: any): Promise<any> { ... }

// ✅ BENAR: Gunakan interface untuk shape data
interface CreateProgramDto {
  title: string;
  category: ProgramCategory;
  budgetPlan: number;
  startDate: Date;
  endDate: Date;
}

// ✅ BENAR: Gunakan enum untuk nilai terbatas
enum ProgramStatus {
  DRAFT      = 'draft',
  SUBMITTED  = 'submitted',
  APPROVED   = 'approved',
  RUNNING    = 'running',
  COMPLETED  = 'completed',
}
```

### 2.2 Penamaan (Naming Convention)

| Konteks | Konvensi | Contoh |
|---------|----------|--------|
| Variabel & fungsi | camelCase | `getUserById`, `totalAmount` |
| Kelas & interface | PascalCase | `ProgramService`, `CreateProgramDto` |
| Konstanta global | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT`, `JWT_SECRET` |
| File TypeScript | kebab-case | `program.service.ts`, `create-program.dto.ts` |
| File Python | snake_case | `ocr_engine.py`, `forecast_model.py` |
| Tabel database | snake_case (plural) | `programs`, `transactions`, `masjid_members` |
| Kolom database | snake_case | `created_at`, `fund_category`, `masjid_id` |
| URL API endpoint | kebab-case | `/api/v1/finance-reports`, `/ai/program-forecast` |
| Event bus | `domain.event_name` | `program.approved`, `donation.paid` |
| Branch Git | `type/short-description` | `feat/donation-flow`, `fix/approval-bug` |

### 2.3 Struktur File per Service (NestJS)

```
program-service/
├── src/
│   ├── main.ts                    # Bootstrap NestJS
│   ├── app.module.ts              # Root module
│   │
│   ├── programs/                  # Feature module
│   │   ├── programs.module.ts
│   │   ├── programs.controller.ts # Route handlers
│   │   ├── programs.service.ts    # Business logic
│   │   ├── programs.repository.ts # DB queries
│   │   ├── entities/
│   │   │   └── program.entity.ts  # TypeORM entity
│   │   ├── dto/
│   │   │   ├── create-program.dto.ts
│   │   │   └── update-program.dto.ts
│   │   └── __tests__/
│   │       ├── programs.service.spec.ts
│   │       └── programs.controller.spec.ts
│   │
│   ├── common/
│   │   ├── decorators/            # Custom decorators
│   │   ├── guards/                # Auth, role guards
│   │   ├── interceptors/          # Logging, transform
│   │   ├── filters/               # Exception filters
│   │   └── pipes/                 # Validation pipes
│   │
│   └── config/
│       └── configuration.ts       # Env config
│
├── test/                          # E2E tests
├── Dockerfile
└── package.json
```

### 2.4 Aturan Controller

```typescript
// programs.controller.ts

import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ProgramsService } from './programs.service';
import { CreateProgramDto } from './dto/create-program.dto';

@ApiTags('programs')           // ← selalu beri tag untuk Swagger
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Post()
  @Roles('pengurus')             // ← selalu eksplisit role yang diizinkan
  @ApiOperation({ summary: 'Buat proposal program baru' })
  async create(
    @Body() dto: CreateProgramDto,
    @Req() req: AuthenticatedRequest,  // ← selalu gunakan typed request
  ) {
    // Controller HANYA routing — logika bisnis ada di service
    return this.programsService.create(dto, req.user.masjidId, req.user.id);
  }
}
```

### 2.5 Aturan Service (Business Logic)

```typescript
// programs.service.ts

@Injectable()
export class ProgramsService {
  constructor(
    private programsRepo: ProgramsRepository,
    private eventBus: EventBusService,
    private notifService: NotificationService,
  ) {}

  async create(dto: CreateProgramDto, masjidId: string, userId: string): Promise<Program> {
    // 1. Validasi bisnis (bukan validasi format — itu di DTO)
    await this.validateBudgetAgainstFundBalance(dto.budgetPlan, dto.fundCategory, masjidId);

    // 2. Buat entitas
    const program = this.programsRepo.create({
      ...dto,
      masjidId,
      createdBy: userId,
      status: ProgramStatus.DRAFT,
    });

    // 3. Simpan ke DB
    const saved = await this.programsRepo.save(program);

    // 4. Publish event (asinkronus — tidak perlu await)
    this.eventBus.publish('program.created', { programId: saved.id, masjidId });

    return saved;
  }

  async approve(programId: string, approverId: string, notes?: string): Promise<Program> {
    const program = await this.programsRepo.findOneOrFail({ where: { id: programId } });

    // Validasi state machine — lihat BUSINESS_RULES.md
    if (program.status !== ProgramStatus.SUBMITTED) {
      throw new InvalidStateTransitionError(
        `Program dengan status '${program.status}' tidak dapat disetujui. ` +
        `Hanya program berstatus 'submitted' yang dapat disetujui.`
      );
    }

    program.status    = ProgramStatus.APPROVED;
    program.approvedBy  = approverId;
    program.approvedAt  = new Date();
    program.approvalNotes = notes;

    const updated = await this.programsRepo.save(program);

    // Event → notif-service akan kirim notifikasi ke pengaju
    this.eventBus.publish('program.approved', {
      programId: updated.id,
      masjidId: updated.masjidId,
      submittedBy: updated.createdBy,
      approvedBy: approverId,
    });

    return updated;
  }
}
```

### 2.6 DTO & Validasi

```typescript
// create-program.dto.ts
import { IsString, IsEnum, IsNumber, IsDateString, Min, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProgramDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsEnum(ProgramCategory)
  category: ProgramCategory;

  @IsString()
  @MaxLength(5000)
  description: string;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  budgetPlan: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsEnum(FundCategory)
  fundCategory: FundCategory;
}
```

### 2.7 Komentar & Dokumentasi Kode

```typescript
/**
 * Menghitung hak amil berdasarkan persentase yang dikonfigurasi masjid.
 * 
 * @param zakатAmount  - Total dana zakat yang diterima (dalam Rupiah)
 * @param amilPct      - Persentase hak amil (0-12.5, default 10)
 * @returns            - Jumlah hak amil dalam Rupiah
 * @throws             - AmiLPercentageExceededError jika amilPct > 12.5
 * 
 * @see COMPLIANCE.md#hak-amil untuk penjelasan syariah
 */
function calculateAmiRight(zakatAmount: number, amilPct: number = 10): number {
  if (amilPct > 12.5) {
    throw new AmilPercentageExceededError(
      `Persentase amil ${amilPct}% melebihi batas syariah maksimal 12.5%`
    );
  }
  return zakatAmount * (amilPct / 100);
}
```

**Aturan komentar:**
- Komentar untuk **mengapa**, bukan **apa** (kode yang baik sudah menjelaskan "apa")
- Semua fungsi publik wajib JSDoc lengkap
- Link ke `BUSINESS_RULES.md` atau `COMPLIANCE.md` bila logika berkaitan syariah/regulasi
- Hapus komentar `TODO` sebelum merge ke `main` — buat issue di Linear/Jira

### 2.8 Konfigurasi ESLint & Prettier

```json
// .eslintrc.json (root)
{
  "extends": [
    "@typescript-eslint/recommended",
    "plugin:@typescript-eslint/strict"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": "error",
    "no-console": "warn",
    "prefer-const": "error"
  }
}

// .prettierrc
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

---

## 3. Git Workflow

### 3.1 Branch Strategy (GitHub Flow yang Dimodifikasi)

```
main           ← Production. Protected. Hanya merge via PR + approval.
  │
develop        ← Staging. Auto-deploy ke staging environment.
  │
  ├── feat/donation-flow          ← Fitur baru
  ├── fix/approval-notification   ← Bug fix
  ├── refactor/finance-service    ← Refactoring
  ├── docs/update-api-contracts   ← Dokumentasi
  └── chore/upgrade-dependencies  ← Maintenance
```

**Aturan branch:**
- Semua development dari `develop`, bukan dari `main`
- Branch `main` dan `develop` **dilindungi** — tidak ada push langsung
- Setiap branch berumur maksimal **2 minggu** — jika lebih, diskusi dengan tech lead

### 3.2 Conventional Commits

Format: `<type>(<scope>): <deskripsi singkat>`

```bash
# Tipe yang valid:
feat      # Fitur baru
fix       # Perbaikan bug
docs      # Perubahan dokumentasi saja
style     # Formatting, whitespace (tanpa perubahan logika)
refactor  # Refactoring tanpa fitur baru / bug fix
test      # Menambah atau mengubah test
chore     # Update dependencies, config, build tools
perf      # Peningkatan performa
ci        # Perubahan CI/CD pipeline

# Scope (opsional tapi dianjurkan):
auth, program, finance, ai, donation, notif, mobile, web, infra

# Contoh commit message yang baik:
feat(program): tambahkan approval berjenjang dua level
fix(finance): perbaiki kalkulasi saldo setelah reversal transaksi
docs(api): update endpoint donasi di API documentation
test(auth): tambahkan unit test untuk refresh token expiry
chore: upgrade NestJS ke versi 10.3.2

# Breaking change — tambahkan ! dan footer BREAKING CHANGE:
feat(auth)!: ubah struktur JWT payload

BREAKING CHANGE: field `userId` di JWT sekarang menggunakan `sub`.
Update semua service yang membaca JWT payload secara manual.
```

### 3.3 Pull Request Workflow

```
1. Buat branch dari develop
   git checkout develop && git pull
   git checkout -b feat/nama-fitur

2. Kerjakan fitur dengan commit kecil-kecil

3. Sebelum PR, pastikan:
   ✓ npm run lint         — tidak ada error
   ✓ npm run test         — semua test passing
   ✓ npm run build        — build berhasil
   ✓ npm run db:migrate   — tidak ada migration konflik

4. Push & buat PR ke develop
   git push origin feat/nama-fitur
   → Buka GitHub, buat PR ke branch develop
   → Isi PR template (lihat .github/PULL_REQUEST_TEMPLATE.md)

5. Code review
   → Minimal 1 reviewer (2 untuk modul keuangan & keamanan)
   → Reviewer wajib cek REVIEW CHECKLIST (bagian 9)
   → Address semua komentar sebelum merge

6. Merge ke develop (Squash & Merge)
   → Gunakan Squash & Merge agar histori develop bersih
   → Auto-deploy ke staging

7. Deploy ke production
   → PR dari develop ke main
   → Butuh approval 1 tech lead + 1 reviewer lain
   → Hanya boleh merge pada hari kerja (Senin-Jumat)
   → Jangan merge Jumat sore menjelang weekend
```

### 3.4 PR Template

```markdown
## Deskripsi
<!-- Apa yang diubah dan mengapa? -->

## Tipe Perubahan
- [ ] Fitur baru (feat)
- [ ] Bug fix (fix)
- [ ] Refactoring (refactor)
- [ ] Perubahan dokumentasi (docs)

## Testing
- [ ] Unit test sudah ditambahkan / diperbarui
- [ ] Integration test sudah dijalankan
- [ ] Manual testing sudah dilakukan (jelaskan skenario)

## Checklist
- [ ] Kode mengikuti coding standards
- [ ] Tidak ada `console.log` yang tersisa
- [ ] Tidak ada hardcoded secret / credential
- [ ] Migrasi database sudah diuji (jika ada)
- [ ] Dokumentasi diperbarui (jika perlu)
- [ ] Tidak ada breaking change ATAU sudah dikomunikasikan

## Screenshot / Video (untuk perubahan UI)
<!-- Tambahkan screenshot sebelum/sesudah jika relevan -->

## Linear/Jira Ticket
<!-- Link ke tiket: https://linear.app/masjidlink/issue/... -->
```

---

## 4. Testing Strategy

### 4.1 Piramida Testing

```
           /\
          /  \
         / E2E \         ← Sedikit, mahal, lambat
        /--------\
       /Integration\     ← Sedang, per service
      /--------------\
     /   Unit Tests   \  ← Banyak, murah, cepat
    /------------------\
```

**Target coverage:**
- Unit test: **≥ 70%** coverage untuk semua service
- Integration test: **semua happy path** + **critical error path**
- E2E test: **5 user journey utama**

### 4.2 Unit Testing (Jest)

```typescript
// programs.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ProgramsService } from './programs.service';
import { ProgramsRepository } from './programs.repository';
import { EventBusService } from '../common/event-bus.service';

// ─── Mock factories ───────────────────────────────────────────────
const mockProgram = (overrides: Partial<Program> = {}): Program => ({
  id: 'prog-uuid-123',
  masjidId: 'masjid-uuid-456',
  title: 'Program Beasiswa Test',
  category: ProgramCategory.PENDIDIKAN,
  status: ProgramStatus.DRAFT,
  budgetPlan: 10_000_000,
  createdBy: 'user-uuid-789',
  createdAt: new Date('2026-01-01'),
  ...overrides,
});

describe('ProgramsService', () => {
  let service: ProgramsService;
  let repo: jest.Mocked<ProgramsRepository>;
  let eventBus: jest.Mocked<EventBusService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgramsService,
        {
          provide: ProgramsRepository,
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            findOneOrFail: jest.fn(),
          },
        },
        {
          provide: EventBusService,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();

    service  = module.get<ProgramsService>(ProgramsService);
    repo     = module.get(ProgramsRepository);
    eventBus = module.get(EventBusService);
  });

  describe('approve()', () => {
    it('harus mengubah status menjadi APPROVED', async () => {
      // Arrange
      const program = mockProgram({ status: ProgramStatus.SUBMITTED });
      repo.findOneOrFail.mockResolvedValue(program);
      repo.save.mockResolvedValue({ ...program, status: ProgramStatus.APPROVED });

      // Act
      const result = await service.approve('prog-uuid-123', 'approver-uuid');

      // Assert
      expect(result.status).toBe(ProgramStatus.APPROVED);
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProgramStatus.APPROVED })
      );
      expect(eventBus.publish).toHaveBeenCalledWith('program.approved', expect.any(Object));
    });

    it('harus melempar error jika status bukan SUBMITTED', async () => {
      // Arrange
      const program = mockProgram({ status: ProgramStatus.DRAFT });
      repo.findOneOrFail.mockResolvedValue(program);

      // Act & Assert
      await expect(service.approve('prog-uuid-123', 'approver-uuid'))
        .rejects.toThrow(InvalidStateTransitionError);
      
      expect(repo.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('harus melempar error jika program tidak ditemukan', async () => {
      repo.findOneOrFail.mockRejectedValue(new EntityNotFoundError('Program', {}));
      
      await expect(service.approve('tidak-ada', 'approver-uuid'))
        .rejects.toThrow(EntityNotFoundError);
    });
  });
});
```

### 4.3 Integration Testing

```typescript
// test/programs.integration.spec.ts
// Menggunakan database PostgreSQL test yang sesungguhnya

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, createTestUser, createTestMasjid } from './helpers';

describe('Programs API (Integration)', () => {
  let app: INestApplication;
  let dkmToken: string;
  let masjidId: string;

  beforeAll(async () => {
    app = await createTestApp();

    // Setup data test
    const masjid = await createTestMasjid();
    masjidId = masjid.id;

    const user = await createTestUser({ role: 'pengurus', masjidId });
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: 'test-password' });

# SECURITY.md
# MasjidLink — Kebijakan Keamanan, Incident Response & Runbook

**Versi:** 1.0.0 | **Tanggal:** Mei 2026 | **Penyusun:** Developer & DevOps MasjidLink  
**Audience:** Developer, DevOps Engineer  
**Klasifikasi:** INTERNAL — Jangan bagikan ke publik

---

## Daftar Isi

1. [Kebijakan Keamanan](#1-kebijakan-keamanan)
2. [Autentikasi & Otorisasi](#2-autentikasi--otorisasi)
3. [Enkripsi & Perlindungan Data](#3-enkripsi--perlindungan-data)
4. [Keamanan Infrastruktur](#4-keamanan-infrastruktur)
5. [Keamanan API](#5-keamanan-api)
6. [Incident Response](#6-incident-response)
7. [Backup & Recovery](#7-backup--recovery)
8. [Monitoring & Alerting](#8-monitoring--alerting)
9. [Runbook — Prosedur Operasional](#9-runbook--prosedur-operasional)
10. [Vulnerability Disclosure](#10-vulnerability-disclosure)

---

## 1. Kebijakan Keamanan

### 1.1 Prinsip Keamanan

| Prinsip | Implementasi |
|---------|-------------|
| **Defense in Depth** | Keamanan berlapis: WAF → API Gateway → Service → Database |
| **Least Privilege** | Setiap service & user hanya punya izin minimum yang dibutuhkan |
| **Zero Trust** | Tidak ada komponen yang otomatis dipercaya — semua diverifikasi |
| **Secure by Default** | Konfigurasi default bersifat aman; fitur harus diaktifkan secara eksplisit |
| **Fail Secure** | Jika terjadi error, sistem menolak akses (bukan membuka akses) |
| **Immutable Audit** | Semua aksi sensitif dicatat dan tidak dapat dihapus |

### 1.2 Klasifikasi Data

| Kelas | Contoh Data | Perlindungan |
|-------|-------------|-------------|
| **RAHASIA** | Password hash, JWT secret, API keys, private keys | Enkripsi AES-256, AWS Secrets Manager, tidak boleh di-log sama sekali |
| **SENSITIF** | Nomor HP, email, riwayat donasi, saldo dana | Enkripsi at-rest, akses terbatas by role, disamarkan di log |
| **INTERNAL** | Data program, laporan keuangan internal | Akses by role, tidak boleh publik tanpa izin DKM |
| **PUBLIK** | Profil masjid, LPJ yang sudah dipublikasikan | Boleh diakses tanpa autentikasi |

### 1.3 Password Policy (Pengurus DKM)

```
Minimal 8 karakter
Kombinasi: huruf besar + huruf kecil + angka + simbol
Tidak boleh sama dengan 5 password terakhir
Wajib ganti setiap 90 hari (role Pengurus)
Maksimal 5 percobaan login gagal → lock 15 menit
2FA wajib untuk aksi keuangan > Rp 5.000.000
```

---

## 2. Autentikasi & Otorisasi

### 2.1 JWT Implementation

```typescript
// Payload JWT yang disimpan
interface JwtPayload {
  sub: string;          // userId (sebelumnya: userId, sekarang: sub — lihat ADR-006)
  email: string;
  role: UserRole;
  masjidId: string | null;
  iat: number;          // issued at
  exp: number;          // expiry
  jti: string;          // JWT ID untuk blacklisting
}

// Konfigurasi token
const JWT_CONFIG = {
  accessToken: {
    secret: process.env.JWT_SECRET,    // Min 32 karakter, simpan di Secrets Manager
    expiresIn: '1h',                   // Short-lived
    algorithm: 'HS256',
  },
  refreshToken: {
    secret: process.env.REFRESH_TOKEN_SECRET,
    expiresIn: '30d',
    storage: 'redis',                  // Opaque token di Redis, bukan JWT
  },
};

// Blacklist token (untuk logout & invalidasi darurat)
async function blacklistToken(jti: string, expirySeconds: number): Promise<void> {
  await redis.setex(`blacklist:${jti}`, expirySeconds, '1');
}

async function isTokenBlacklisted(jti: string): Promise<boolean> {
  return (await redis.exists(`blacklist:${jti}`)) === 1;
}
```

### 2.2 Role-Based Access Control (RBAC)

```typescript
enum UserRole {
  ADMIN    = 'admin',      // Tim MasjidLink internal
  PENGURUS = 'pengurus',   // Ketua DKM, bendahara, sekretaris
  JAMAAH   = 'jamaah',     // Anggota masjid
  DONATUR  = 'donatur',    // Donatur terdaftar
  PUBLIC   = 'public',     // Tidak login (akses sangat terbatas)
}

// Matriks izin per endpoint
const PERMISSION_MATRIX = {
  'programs:create':          ['pengurus'],
  'programs:approve':         ['pengurus'],           // Khusus Ketua DKM (validasi di service)
  'programs:view_all':        ['pengurus'],
  'programs:view_public':     ['jamaah', 'donatur', 'public'],
  'finance:write':            ['pengurus'],
  'finance:view_dashboard':   ['pengurus'],
  'finance:view_public':      ['jamaah', 'donatur', 'public'],
  'donations:create':         ['donatur'],
  'donations:view_own':       ['donatur'],
  'users:manage':             ['admin'],
  'masjid:manage':            ['pengurus', 'admin'],
};

// Guard implementation
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<UserRole[]>('roles', context.getHandler());
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Role '${user.role}' tidak memiliki izin untuk aksi ini.`
      );
    }
    return true;
  }
}
```

### 2.3 Two-Factor Authentication (2FA)

2FA wajib untuk pengurus yang melakukan aksi:
- Persetujuan program dengan anggaran > Rp 10.000.000
- Input transaksi pengeluaran > Rp 5.000.000
- Perubahan pengaturan bank/pembayaran masjid
- Export data keuangan lengkap

```typescript
// Implementasi TOTP (Time-based One-Time Password)
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

async function setup2FA(userId: string): Promise<{ qrCode: string; backupCodes: string[] }> {
  const secret = speakeasy.generateSecret({
    name: `MasjidLink (${userEmail})`,
    issuer: 'MasjidLink',
  });

  // Simpan secret terenkripsi di DB
  await userRepo.update(userId, {
    totpSecret: encrypt(secret.base32),
    totpEnabled: false,  // Baru aktif setelah verified
  });

  const qrCode = await QRCode.toDataURL(secret.otpauth_url);
  const backupCodes = generateBackupCodes(8);  // 8 backup codes

  return { qrCode, backupCodes };
}

function verify2FA(totpSecret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret: totpSecret,
    encoding: 'base32',
    token,
    window: 1,  // Toleransi 30 detik maju/mundur
  });
}
```

---

## 3. Enkripsi & Perlindungan Data

### 3.1 Enkripsi At-Rest

```typescript
// Kolom sensitif di database dienkripsi menggunakan AES-256-GCM
// Implementasi menggunakan TypeORM Column Transformer

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = Buffer.from(process.env.DB_ENCRYPTION_KEY, 'hex'); // 32 bytes

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  
  const iv      = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Kolom yang dienkripsi
@Column({
  transformer: {
    to: (value: string) => value ? encrypt(value) : null,
    from: (value: string) => value ? decrypt(value) : null,
  }
})
phoneNumber: string;
```

### 3.2 Enkripsi In-Transit

```nginx
# nginx.conf — SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-RSA-AES128-GCM-SHA256;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# HSTS
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

# Prevent clickjacking
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header Referrer-Policy strict-origin-when-cross-origin always;
```

### 3.3 Secrets Management

```bash
# SEMUA secret disimpan di AWS Secrets Manager
# TIDAK ADA secret di:
# - Kode sumber (git)
# - Environment variables di Docker image
# - Config file yang di-commit ke repo

# Cara akses secret di runtime
aws secretsmanager get-secret-value \
  --secret-id masjidlink/production/database \
  --query 'SecretString' \
  --output text | jq -r '.password'

# Rotasi otomatis secret database setiap 30 hari
# Rotasi manual API keys setiap 90 hari
```

### 3.4 Masking Data di Log

```typescript
// Middleware untuk mask data sensitif di semua log
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'apiKey', 'cardNumber', 'cvv'];
const PARTIAL_MASK_FIELDS = ['email', 'phone', 'nik'];

function maskSensitiveData(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      const lowerKey = key.toLowerCase();
      
      if (SENSITIVE_FIELDS.some(f => lowerKey.includes(f))) {
        return [key, '[REDACTED]'];
      }
      
      if (PARTIAL_MASK_FIELDS.some(f => lowerKey.includes(f)) && typeof value === 'string') {
        // Email: j***@example.com | Phone: +628***89
        return [key, maskPartially(value, lowerKey)];
      }
      
      if (typeof value === 'object' && value !== null) {
        return [key, maskSensitiveData(value as Record<string, unknown>)];
      }
      
      return [key, value];
    })
  );
}
```

---

## 4. Keamanan Infrastruktur

### 4.1 Network Security

```yaml
# Kubernetes NetworkPolicy — setiap service hanya boleh bicara ke yang diperlukan
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: finance-service-netpol
  namespace: masjidlink-prod
spec:
  podSelector:
    matchLabels:
      app: finance-service
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api-gateway  # Hanya API Gateway boleh akses finance-service
      ports:
        - protocol: TCP
          port: 3002
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres-finance  # Hanya DB finance-service
      ports:
        - port: 5432
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - port: 6379
```

### 4.2 Container Security

```dockerfile
# Dockerfile best practices untuk setiap service

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production   # ← Hanya production deps

FROM node:20-alpine AS runtime
# Jangan jalankan sebagai root
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs                     # ← Non-root user

WORKDIR /app
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --chown=nestjs:nodejs dist ./dist

# Hapus tool yang tidak diperlukan
RUN apk del --purge apk-tools

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### 4.3 AWS Security Configuration

```bash
# IAM Role untuk EKS nodes — Least privilege
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"   # Hanya baca secret
      ],
      "Resource": "arn:aws:secretsmanager:ap-southeast-1:*:secret:masjidlink/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::masjidlink-storage/*"
    }
    # TIDAK ada: s3:*, iam:*, ec2:*, dll.
  ]
}
```

---

## 5. Keamanan API

### 5.1 Rate Limiting

```typescript
// Rate limiting per endpoint category
const RATE_LIMITS = {
  'auth:login':           { windowMs: 15 * 60 * 1000, max: 5,    message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
  'auth:register':        { windowMs: 60 * 60 * 1000, max: 3,    message: 'Terlalu banyak pendaftaran dari IP ini.' },
  'auth:forgot-password': { windowMs: 60 * 60 * 1000, max: 3,    message: 'Batas permintaan reset password tercapai.' },
  'api:general':          { windowMs:       60 * 1000, max: 100,  message: 'Terlalu banyak request. Coba lagi dalam 1 menit.' },
  'api:authenticated':    { windowMs:       60 * 1000, max: 1000, message: 'Rate limit tercapai.' },
  'ai:chatbot':           { windowMs: 60 * 60 * 1000, max: 20,   message: 'Batas penggunaan chatbot per jam tercapai.' },
  'donations:create':     { windowMs:       60 * 1000, max: 5,    message: 'Terlalu banyak request donasi. Tunggu sebentar.' },
};
```

### 5.2 Input Validation & Sanitization

```typescript
// Semua input divalidasi menggunakan class-validator + sanitasi

// Cegah XSS: strip HTML tags dari semua string input
@Transform(({ value }) => typeof value === 'string' ? sanitizeHtml(value, { allowedTags: [] }) : value)
@IsString()
description: string;

// Cegah path traversal di file upload
function validateFilename(filename: string): string {
  // Hapus karakter berbahaya
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Cegah path traversal
  if (safe.includes('..') || safe.startsWith('/')) {
    throw new BadRequestException('Nama file tidak valid.');
  }
  return safe;
}

// Validasi file upload
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function validateUploadedFile(file: Express.Multer.File): void {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestException(`Tipe file ${file.mimetype} tidak diizinkan.`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestException(`Ukuran file melebihi batas 10MB.`);
  }
}
```

### 5.3 Security Headers

```typescript
// main.ts — setup security middleware
import helmet from 'helmet';
import * as csurf from 'csurf';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'strict-dynamic'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // TailwindCSS butuh ini
      imgSrc: ["'self'", 'data:', 'https://storage.masjidlink.id'],
      connectSrc: ["'self'", 'https://api.masjidlink.id'],
      frameSrc: ["'none'"],
    },
  },
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
  noSniff: true,
  xssFilter: true,
}));
```

---

## 6. Incident Response

### 6.1 Tingkat Keparahan Insiden

| Tingkat | Definisi | Response Time | Eskalasi |
|---------|----------|---------------|---------|
| **P0 - Critical** | Sistem production down total / kebocoran data massal | 15 menit | Semua tim + CEO |
| **P1 - High** | Fitur utama tidak berfungsi / potensi kebocoran data | 1 jam | Tech Lead + DevOps |
| **P2 - Medium** | Fitur sekunder bermasalah / performa degradasi | 4 jam | On-call engineer |
| **P3 - Low** | Bug minor yang tidak mempengaruhi operasional utama | 24 jam | Developer normal |

### 6.2 Incident Response Playbook

```
╔════════════════════════════════════════════════════════╗
║              INCIDENT RESPONSE FLOW                    ║
╚════════════════════════════════════════════════════════╝

FASE 1: DETEKSI (0-15 menit)
  → Alert masuk via Grafana / PagerDuty / laporan user
  → On-call engineer acknowledge alert
  → Buka #incident-TANGGAL di Slack
  → Tentukan tingkat keparahan (P0/P1/P2/P3)

FASE 2: CONTAINMENT (15-30 menit)
  → Isolasi sistem yang terdampak
  → Jika P0: pertimbangkan maintenance mode
  → Preserve evidence: capture logs SEBELUM restart
  → Notifikasi stakeholder sesuai tingkat

FASE 3: INVESTIGATION (30-120 menit)
  → Root cause analysis
  → Cek log: Grafana → Kibana → Service logs
  → Cek recent deployments (ada deploy dalam 2 jam terakhir?)
  → Cek DB: slow queries, lock, replication lag

FASE 4: REMEDIATION
  → Implementasi fix (hotfix / rollback / config change)
  → Test di staging sebelum apply ke production
  → Deploy dengan monitoring ketat

FASE 5: RECOVERY
  → Verifikasi sistem normal kembali
  → Informasikan pengguna (jika perlu)
  → Close incident channel

FASE 6: POST-MORTEM (dalam 48 jam)
  → Tulis incident report
  → Timeline kejadian
  → Root cause
  → Action items untuk mencegah berulang
  → Share ke seluruh tim engineering
```

### 6.3 Prosedur Kebocoran Data (Data Breach)

```
DETEKSI KEBOCORAN DATA
        │
        ▼
1. SEGERA isolasi sistem yang bocor
   → Cabut akses API key / token yang terdampak
   → Rotasi semua credential yang mungkin terekspos

2. DALAM 1 JAM — Notifikasi internal
   → CEO, CTO, Legal
   → Jangan beri detail ke publik dulu

3. INVESTIGASI
   → Data apa yang bocor? Siapa yang terdampak?
   → Berapa lama kejadian berlangsung?
   → Capture semua log dan evidence

4. DALAM 72 JAM — Kewajiban Hukum (UU PDP Pasal 46)
   → Laporkan ke Lembaga PDP (Kementerian Kominfo)
   → Notifikasi subjek data yang terdampak
   → Sertakan: jenis data, perkiraan jumlah, langkah mitigasi

5. REMEDIATION
   → Patch vulnerability
   → Force logout semua user yang mungkin terdampak
   → Reset password paksa jika password terekspos

6. POST-BREACH REVIEW
   → Audit keamanan menyeluruh
   → Update kebijakan