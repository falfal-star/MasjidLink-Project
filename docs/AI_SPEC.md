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
    image_bytes = await file.read()
    processed = preprocess_image(image_bytes)

    # Coba Google Vision API dulu
    try:
        client = vision.ImageAnnotatorClient()
        image = vision.Image(content=processed)
        response = client.text_detection(image=image)
        
        if response.error.message:
            raise Exception(response.error.message)
        
        raw_text = response.full_text_annotation.text
        confidence = 0.95
        source = 'google_vision'

    except Exception:
        # Fallback ke Tesseract
        img = Image.open(io.BytesIO(processed))
        raw_text = pytesseract.image_to_string(img, lang='ind+eng')
        confidence = 0.75
        source = 'tesseract'

    result = OCRResult(
        raw_text=raw_text,
        extracted_amount=extract_rupiah_amount(raw_text),
        extracted_date=extract_date(raw_text),
        extracted_description=extract_description(raw_text, document_type),
        confidence=confidence,
        source=source,
    )

    return {
        "success": True,
        "data": result.__dict__,
        "requires_manual_review": confidence < 0.80,
    }
```

### 3.4 Alur OCR untuk Input Transaksi

```
Pengurus foto struk/bukti transfer
           │
           ▼
    Upload via MasjidLink App
           │
           ▼
    OCR Engine proses gambar
           │
    ┌──────┴──────┐
    │             │
confidence > 0.80  confidence ≤ 0.80
    │             │
    ▼             ▼
Pre-fill form   Tampilkan hasil OCR
transaksi       + flag "Harap Verifikasi"
otomatis        + highlight field
    │             │
    └──────┬──────┘
           ▼
    Pengurus review & konfirmasi
           │
           ▼
    Simpan transaksi ke DB
```

### 3.5 API Contract OCR

```typescript
// POST /ai/ocr/process
interface OCRRequest {
  file: File;                  // Image: JPG, PNG, PDF (maks 10MB)
  document_type: 
    | 'receipt'                // Struk/nota pengeluaran
    | 'transfer_proof'         // Bukti transfer masuk
    | 'lpj_document'           // Dokumen LPJ fisik
    | 'general';               // Dokumen umum
}

interface OCRResponse {
  success: boolean;
  data: {
    raw_text: string;
    extracted_amount: number | null;      // Nominal dalam Rupiah
    extracted_date: string | null;        // Format: YYYY-MM-DD
    extracted_description: string | null; // Deskripsi/keterangan
    confidence: number;                  // 0.0 - 1.0
    source: 'google_vision' | 'tesseract';
  };
  requires_manual_review: boolean;
}
```

---

## 4. WhatsApp Bot Flow

### 4.1 Arsitektur WhatsApp Bot

```
Pengguna kirim pesan WhatsApp
           │
           ▼
  WhatsApp Business API
           │  Webhook POST
           ▼
   notif-service/whatsapp-webhook
           │
           ▼
   Intent Classifier
   (keyword matching + Claude API)
           │
    ┌──────┼──────────────────┐
    │      │                  │
    ▼      ▼                  ▼
 Info    DKM Bot          Donasi Flow
 Publik  (terautentikasi) (link ke app)
```

### 4.2 Registrasi & Autentikasi WhatsApp

```
Langkah 1: Pengguna kirim "DAFTAR" ke nomor WhatsApp MasjidLink
Langkah 2: Bot balas dengan OTP 6 digit (TTL 10 menit)
Langkah 3: Pengguna balas dengan OTP
Langkah 4: Sesi WhatsApp terhubung ke akun MasjidLink (TTL 24 jam)
```

### 4.3 Flow Diagram Percakapan

#### Flow A: Cek Status Program (Jamaah/Donatur)

```
User: "status program beasiswa"
         │
         ▼
Bot: Cari program dengan kata kunci "beasiswa"
     di masjid yang terhubung dengan nomor WA ini
         │
    ┌────┴────┐
  Ditemukan  Tidak ditemukan
    │              │
    ▼              ▼
Bot: "Program       Bot: "Program tidak
Beasiswa Santri     ditemukan. Ketik
Dhuafa 2026         CARI <nama program>
Status: BERJALAN    untuk pencarian lebih
Dana: 72% terkumpul luas, atau buka app
Peserta: 48/50"     MasjidLink."
```

#### Flow B: Info Keuangan Masjid (Donatur)

```
User: "laporan keuangan april"
         │
         ▼
Cek: User sudah login? (sesi aktif)
         │
    ┌────┴────┐
   Ya        Tidak
    │          │
    ▼          ▼
Ambil laporan  Bot: "Silakan login dulu.
keuangan April Ketik LOGIN atau buka
masjid terkait https://masjidlink.id/login"
    │
    ▼
Bot kirim ringkasan:
"📊 Laporan April 2026 - Masjid Al-Ikhlas
💰 Pemasukan : Rp 42.500.000
💸 Pengeluaran: Rp 31.200.000
💵 Saldo Akhir: Rp 11.300.000

Untuk laporan lengkap: [link PDF]"
```

#### Flow C: Notifikasi Approval (DKM)

```
[Trigger: Program baru diajukan di sistem]
         │
         ▼
notif-service → WhatsApp API
         │
         ▼
Bot kirim ke Ketua DKM:
"🕌 *MasjidLink - Proposal Baru*

Proposal *Program Beasiswa Santri 2026*
diajukan oleh Bpk. Ahmad Fauzi.

📋 Anggaran: Rp 15.000.000
📅 Periode: 1 Jun - 31 Agu 2026
👥 Target: 50 penerima

Balas *SETUJU [ID]* untuk approve
Balas *TOLAK [ID]* untuk reject
Atau review lengkap: [link]"
         │
    ┌────┴────┐
User balas   User balas
"SETUJU abc"  "TOLAK abc"
    │              │
    ▼              ▼
Panggil         Minta alasan:
program-service  "Ketik alasan
approve API      penolakan:"
    │              │
    ▼              ▼
Konfirmasi      Update status
ke Ketua DKM    → REJECTED
    │              │
    └─────┬─────────┘
          ▼
  Notif ke pengaju proposal
```

#### Flow D: Donasi via WhatsApp

```
User: "donasi program beasiswa"
         │
         ▼
Bot: "Untuk berdonasi ke Program Beasiswa
     Santri Dhuafa 2026, pilih nominal:
     1️⃣ Rp 50.000
     2️⃣ Rp 100.000
     3️⃣ Rp 250.000
     4️⃣ Nominal lain (ketik jumlahnya)"
         │
User: "2" (atau nominal custom)
         │
         ▼
Bot: "Total: Rp 100.000
     Pilih metode pembayaran:
     1️⃣ Transfer Bank (BCA/Mandiri/BNI)
     2️⃣ QRIS
     3️⃣ Link pembayaran (GoPay/OVO/Dana)"
         │
User pilih metode
         │
         ▼
donation-service: buat order Midtrans
         │
         ▼
Bot kirim link/instruksi pembayaran
         │
         ▼
[Setelah bayar — webhook Midtrans]
         │
         ▼
Bot: "✅ Jazakallahu khayran!
     Donasi Rp 100.000 Anda
     telah diterima untuk
     Program Beasiswa Santri.
     Bukti: [link]"
```

### 4.4 Command Registry WhatsApp Bot

| Command | Contoh Input | Respons |
|---------|-------------|---------|
| `DAFTAR` | "DAFTAR" | Mulai registrasi / kirim OTP |
| `LOGIN` | "LOGIN" | Kirim link login atau OTP |
| `STATUS [program]` | "STATUS beasiswa" | Info program terkini |
| `LAPORAN [bulan]` | "LAPORAN april" | Ringkasan keuangan |
| `DONASI [program]` | "DONASI beasiswa" | Flow donasi |
| `PROGRAM` | "PROGRAM" | Daftar program aktif |
| `BANTUAN` | "BANTUAN" atau "HELP" | Menu semua command |
| `SETUJU [id]` | "SETUJU abc123" | Approve proposal (DKM only) |
| `TOLAK [id]` | "TOLAK abc123" | Reject proposal (DKM only) |
| `KELUAR` | "KELUAR" | Logout sesi WhatsApp |

### 4.5 Implementasi Webhook Handler

```typescript
// services/notif-service/src/whatsapp/webhook.handler.ts

import { Controller, Post, Body, Headers } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { IntentClassifier } from './intent.classifier';
import { PromptRegistryService } from '../../ai-service/src/prompt-registry.service';
import Anthropic from '@anthropic-ai/sdk';

@Controller('webhook/whatsapp')
export class WhatsAppWebhookHandler {
  private claude = new Anthropic();

  constructor(
    private waService: WhatsAppService,
    private intentClassifier: IntentClassifier,
    private promptRegistry: PromptRegistryService,
  ) {}

  @Post()
  async handleIncoming(@Body() payload: WhatsAppWebhookPayload) {
    const { from, text, messageId } = this.extractMessage(payload);

    // 1. Acknowledge message (mark as read)
    await this.waService.markAsRead(messageId);

    // 2. Klasifikasi intent
    const intent = await this.intentClassifier.classify(text);

    // 3. Cek sesi login
    const session = await this.waService.getSession(from);

    // 4. Route ke handler yang tepat
    switch (intent.type) {
      case 'REGISTER':
        return this.handleRegister(from);
      case 'APPROVAL':
        return this.handleApproval(from, intent, session);
      case 'INFO_QUERY':
        return this.handleInfoQuery(from, intent, session);
      case 'DONATION':
        return this.handleDonation(from, intent, session);
      case 'GENERAL_CHAT':
        return this.handleGeneralChat(from, text, session);
    }
  }

  private async handleGeneralChat(from: string, text: string, session: WaSession) {
    const systemPrompt = await this.promptRegistry.getPrompt(
      session?.isLoggedIn ? 'chatbot_dkm_system' : 'chatbot_jamaah_public_system',
      { masjid_name: session?.masjidName ?? 'masjid Anda' }
    );

    const response = await this.claude.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        ...session.history.slice(-10),  // 10 pesan terakhir untuk konteks
        { role: 'user', content: text }
      ],
    });

    const reply = response.content[0].type === 'text' ? response.content[0].text : '';
    await this.waService.sendMessage(from, reply);
    await this.waService.appendToHistory(from, text, reply);
  }
}
```

---

## 5. Integration Contracts

### 5.1 Contract: ai-service ↔ Claude API

```typescript
// Tipe kontrak untuk semua panggilan Claude API

interface ClaudeRequest {
  model: 'claude-sonnet-4-5';         // Selalu gunakan model ini
  max_tokens: number;                  // Default: 1024, maks: 4096
  system?: string;                     // System prompt dari Prompt Registry
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;                // Default: 0.7; gunakan 0.1 untuk output struktural
  metadata?: {
    user_id: string;                   // Untuk logging & rate limiting
    masjid_id: string;
    session_id: string;
  };
}

interface ClaudeResponse {
  id: string;
  content: Array<{ type: 'text'; text: string }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  stop_reason: 'end_turn' | 'max_tokens';
}

// Wrapper dengan retry & error handling
async function callClaude(request: ClaudeRequest, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await anthropic.messages.create(request);
      return response.content[0].type === 'text' ? response.content[0].text : '';
    } catch (error) {
      if (error.status === 529 && i < retries - 1) {
        await sleep(1000 * Math.pow(2, i));  // exponential backoff
        continue;
      }
      throw error;
    }
  }
}
```

### 5.2 Contract: ai-service ↔ Python ML Services

```typescript
// Base URL: http://ml-service:8001
// Semua endpoint menggunakan JSON POST

// ─── Recommendation Engine ───────────────────────────────────────
// POST /recommend/programs
interface RecommendRequest {
  donor_id: string;
  preferences: string[];       // kategori yang diminati
  donation_history: Array<{
    program_category: string;
    amount: number;
    created_at: string;
  }>;
  location: { city: string; province: string };
  limit: number;               // default: 5
}

interface RecommendResponse {
  recommendations: Array<{
    program_id: string;
    score: number;             // 0.0 - 1.0
    score_pct: number;         // 0 - 100
    reasons: string[];         // ['Sesuai kategori sosial', 'Masjid terdekat', ...]
  }>;
  model_version: string;
  generated_at: string;
}

// ─── Forecast Engine ─────────────────────────────────────────────
// POST /forecast/funding
interface ForecastRequest {
  masjid_id: string;
  months_ahead: number;        // 1-3
  historical_transactions: Array<{
    month: string;             // YYYY-MM
    total_income: number;
    categories: Record<string, number>;
  }>;
  upcoming_events: string[];   // ['ramadan', 'idul_adha', ...]
}

interface ForecastResponse {
  forecasts: Array<{
    month: string;
    predicted_income: number;
    confidence_interval: { lower: number; upper: number };
    confidence_level: number;  // 0.0 - 1.0
  }>;
  model: 'prophet';
  rmse: number;
}

// ─── Anomaly Detector ────────────────────────────────────────────
// POST /anomaly/detect
interface AnomalyRequest {
  transaction: {
    id: string;
    amount: number;
    type: 'income' | 'expense';
    fund_category: string;
    transaction_date: string;
    hour_of_day: number;
  };
  historical_stats: {
    mean: number;
    std_dev: number;
    p95: number;
    p99: number;
  };
}

interface AnomalyResponse {
  is_anomaly: boolean;
  anomaly_score: number;       // -1 = anomali, 1 = normal (Isolation Forest output)
  risk_level: 'low' | 'medium' | 'high';
  reason: string;
  recommended_action: 'none' | 'notify_admin' | 'hold_transaction';
}

// ─── Sentiment Analyzer ──────────────────────────────────────────
// POST /sentiment/analyze
interface SentimentRequest {
  texts: string[];             // Array feedback/komentar
  program_id: string;
}

interface SentimentResponse {
  overall_score: number;       // -1.0 (sangat negatif) s/d 1.0 (sangat positif)
  label: 'positive' | 'neutral' | 'negative';
  breakdown: {
    positive_count: number;
    neutral_count: number;
    negative_count: number;
  };
  keywords: {
    positive: string[];
    negative: string[];
  };
  model: 'indobert';
}
```

### 5.3 Contract: ai-service ↔ finance-service (untuk Anomaly Detection)

Dipanggil secara asinkronus via Redis event bus:

```typescript
// Event: transaction.created (dipublish oleh finance-service)
interface TransactionCreatedEvent {
  event: 'transaction.created';
  payload: {
    transaction_id: string;
    masjid_id: string;
    amount: number;
    type: 'income' | 'expense';
    fund_category: string;
    transaction_date: string;
    recorded_at: string;
  };
}

// Event: anomaly.detected (dipublish oleh ai-service, dikonsumsi notif-service)
interface AnomalyDetectedEvent {
  event: 'anomaly.detected';
  payload: {
    transaction_id: string;
    masjid_id: string;
    risk_level: 'medium' | 'high';
    reason: string;
    detected_at: string;
  };
}
```

### 5.4 Contract: AI Rate Limiting

```typescript
// Rate limits per masjid (untuk mengendalikan biaya API)
const AI_RATE_LIMITS = {
  chatbot_messages_per_day: 500,       // per masjid
  chatbot_messages_per_user_per_hour: 20,
  ocr_requests_per_day: 200,
  recommendation_requests_per_day: 1000,
  forecast_requests_per_day: 50,
};

// Response bila rate limit terlampaui
interface RateLimitExceededResponse {
  error: 'RATE_LIMIT_EXCEEDED';
  message: 'Batas penggunaan AI harian telah tercapai. Coba lagi besok.';
  reset_at: string;  // ISO timestamp kapan limit direset
  limit: number;
  remaining: number;
}
```

---

## 6. Model Rekomendasi Program

### 6.1 Algoritma: Hybrid Collaborative + Content-Based Filtering

```python
# services/ai-service/python/recommendation_engine.py

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler
import pandas as pd

class ProgramRecommendationEngine:
    """
    Hybrid recommendation: gabungan collaborative filtering (CF)
    dan content-based filtering (CBF) dengan bobot 60/40.
    """

    CF_WEIGHT = 0.6   # Bobot collaborative filtering
    CBF_WEIGHT = 0.4  # Bobot content-based filtering

    def recommend(
        self,
        donor_id: str,
        donor_preferences: list[str],
        donation_history: list[dict],
        available_programs: list[dict],
        limit: int = 5
    ) -> list[dict]:
        
        # 1. Content-based score: kecocokan kategori & lokasi
        cbf_scores = self._content_based_score(
            donor_preferences, available_programs
        )

        # 2. Collaborative score: kemiripan dengan donatur lain
        cf_scores = self._collaborative_score(
            donor_id, donation_history, available_programs
        )

        # 3. Gabungkan dengan bobot
        final_scores = {}
        for prog in available_programs:
            prog_id = prog['id']
            cbf = cbf_scores.get(prog_id, 0)
            cf  = cf_scores.get(prog_id, 0)
            final_scores[prog_id] = (self.CF_WEIGHT * cf) + (self.CBF_WEIGHT * cbf)

        # 4. Filter program yang sudah pernah didonasi
        donated_ids = {d['program_id'] for d in donation_history}
        filtered = {k: v for k, v in final_scores.items() if k not in donated_ids}

        # 5. Urutkan dan ambil top-N
        sorted_programs = sorted(filtered.items(), key=lambda x: x[1], reverse=True)[:limit]

        return [
            {
                'program_id': prog_id,
                'score': round(score, 4),
                'score_pct': round(score * 100),
                'reasons': self._generate_reasons(prog_id, donor_preferences, donation_history),
            }
            for prog_id, score in sorted_programs
        ]

    def _content_based_score(self, preferences, programs) -> dict:
        scores = {}
        for prog in programs:
            cat_match = 1.0 if prog['category'] in preferences else 0.3
            urgency_boost = 1.2 if prog['days_remaining'] < 14 else 1.0
            funding_gap_boost = 1.0 + (1.0 - prog['funding_percentage'] / 100) * 0.3
            scores[prog['id']] = min(cat_match * urgency_boost * funding_gap_boost, 1.0)
        return scores
```

### 6.2 Jadwal Retraining Model

| Event | Aksi |
|-------|------|
| Setiap Senin 03:00 WIB | Full retrain dengan data 90 hari terakhir |
| Setelah 1.000 donasi baru | Incremental update |
| Setelah lebaran / Ramadan | Manual retrain dengan seasonal adjustment |

---

## 7. Model Prediksi Dana

### 7.1 Facebook Prophet Configuration

```python
# services/ai-service/python/forecast_engine.py

from prophet import Prophet
import pandas as pd

def create_forecast_model(historical_data: list[dict], upcoming_events: list[str]) -> dict:
    """
    Prediksi kebutuhan dana menggunakan Facebook Prophet
    dengan seasonal adjustment untuk event Islam.
    """
    df = pd.DataFrame(historical_data)
    df.columns = ['ds', 'y']  # Prophet format
    df['ds'] = pd.to_datetime(df['ds'])

    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=False,   # Data bulanan, tidak perlu weekly
        daily_seasonality=False,
        changepoint_prior_scale=0.05,
        seasonality_prior_scale=10.0,
    )

    # Tambah seasonal effect untuk Ramadan
    if 'ramadan' in upcoming_events:
        model.add_seasonality(
            name='ramadan',
            period=354.37,    # Panjang tahun Hijriah
            fourier_order=5,
            prior_scale=10.0,
        )

    model.fit(df)

    future = model.make_future_dataframe(periods=3, freq='MS')  # 3 bulan ke depan
    forecast = model.predict(future)

    return {
        'forecasts': [
            {
                'month': row['ds'].strftime('%Y-%m'),
                'predicted_income': max(0, round(row['yhat'])),
                'confidence_interval': {
                    'lower': max(0, round(row['yhat_lower'])),
                    'upper': max(0, round(row['yhat_upper'])),
                },
                'confidence_level': min(0.95, max(0.5,
                    1 - abs(row['yhat_upper'] - row['yhat_lower']) / (row['yhat'] + 1)
                )),
            }
            for _, row in forecast.tail(3).iterrows()
        ],
        'model': 'prophet',
    }
```

---

## 8. Deteksi Anomali Keuangan

### 8.1 Isolation Forest Configuration

```python
from sklearn.ensemble import IsolationForest
import numpy as np

class AnomalyDetector:
    """
    Isolation Forest untuk deteksi transaksi keuangan anomali.
    Model dilatih per masjid menggunakan histori 6 bulan terakhir.
    """
    
    CONTAMINATION = 0.05  # Estimasi 5% data adalah anomali

    def detect(self, transaction: dict, historical_stats: dict) -> dict:
        # Z-score sederhana untuk deteksi cepat
        z_score = (transaction['amount'] - historical_stats['mean']) / \
                  (historical_stats['std_dev'] + 1)

        # Rule-based checks
        is_anomaly = False
        reasons = []

        if transaction['amount'] > historical_stats['p99'] * 2:
            is_anomaly = True
            reasons.append(f"Nominal {transaction['amount']:,.0f} jauh melebihi normal")

        unusual_hour = transaction['hour_of_day'] < 6 or transaction['hour_of_day'] > 22
        if unusual_hour:
            is_anomaly = True
            reasons.append("Transaksi dilakukan di luar jam operasional normal")

        risk_level = 'low'
        if is_anomaly:
            risk_level = 'high' if z_score > 5 else 'medium'

        return {
            'is_anomaly': is_anomaly,
            'anomaly_score': round(min(z_score / 10, 1.0), 3),
            'risk_level': risk_level,
            'reason': '; '.join(reasons) if reasons else 'Transaksi normal',
            'recommended_action': 'notify_admin' if risk_level == 'high' else 'none',
        }
```

---

## 9. Sentiment Analysis

### 9.1 IndoBERT Pipeline

```python
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification

class SentimentAnalyzer:
    """
    Analisis sentimen feedback jamaah menggunakan model IndoBERT
    yang sudah di-fine-tune untuk teks Bahasa Indonesia.
    """
    
    MODEL_NAME = 'mdhugol/indonesia-bert-sentiment-classification'

    def __init__(self):
        self.tokenizer = AutoTokenizer.from_pretrained(self.MODEL_NAME)
        self.model = AutoModelForSequenceClassification.from_pretrained(self.MODEL_NAME)
        self.pipe = pipeline('sentiment-analysis', model=self.model, tokenizer=self.tokenizer)
    
    def analyze_batch(self, texts: list[str]) -> dict:
        results = self.pipe(texts, truncation=True, max_length=512)
        
        label_map = {'LABEL_0': 'positive', 'LABEL_1': 'neutral', 'LABEL_2': 'negative'}
        scores = {'positive': 0, 'neutral': 0, 'negative': 0}
        
        for result in results:
            label = label_map.get(result['label'], 'neutral')
            scores[label] += 1

        total = len(results)
        overall = (scores['positive'] - scores['negative']) / total

        return {
            'overall_score': round(overall, 3),
            'label': 'positive' if overall > 0.1 else ('negative' if overall < -0.1 else 'neutral'),
            'breakdown': {k: v for k, v in scores.items()},
        }
```

---

## 10. Error Handling & Fallback Strategy

| Skenario Error | Fallback | User Experience |
|----------------|----------|-----------------|
| Claude API down / timeout | Respons pre-written dari FAQ DB | "Maaf, asisten AI sedang tidak tersedia. Berikut informasi yang mungkin membantu: [FAQ]" |
| Claude API rate limit (429) | Queue request, retry 60 detik | "Sedang ramai, respons Anda akan dikirim sebentar lagi." |
| Python ML service down | Rekomendasi berbasis aturan sederhana (rule-based) | Tampil program terpopuler tanpa personalisasi |
| OCR confidence < 0.5 | Return raw text + flag manual review | "Kualitas gambar kurang jelas. Silakan isi manual atau unggah foto yang lebih terang." |
| Anomaly service down | Log transaksi tanpa pengecekan anomali | Transaksi tetap diproses, alert dikirim ke admin internal |

---

## 11. Monitoring & Evaluation AI

### 11.1 Metrik yang Dipantau

| Metrik | Target | Alert Threshold |
|--------|--------|-----------------|
| Chatbot response latency | < 3 detik | > 5 detik |
| Claude API error rate | < 1% | > 3% |
| Recommendation click-through rate | > 15% | < 8% |
| Anomaly false positive rate | < 10% | > 20% |
| OCR accuracy (verified samples) | > 85% | < 75% |
| Sentiment analysis accuracy | > 80% | < 70% |

### 11.2 Logging Standar

```typescript
// Setiap AI request dicatat di tabel ai_request_logs
interface AIRequestLog {
  id: string;
  service: 'chatbot' | 'recommend' | 'forecast' | 'anomaly' | 'sentiment' | 'ocr';
  masjid_id: string;
  user_id: string;
  request_payload_hash: string;   // Hash SHA-256, bukan plaintext
  response_length: number;
  latency_ms: number;
  model_used: string;
  tokens_used?: number;           // Untuk Claude API
  error?: string;
  created_at: string;
}
```

---

*Dokumen ini harus diperbarui setiap kali ada perubahan model, prompt, atau kontrak API AI.*  
**Hubungi:** ai-team@masjidlink.id  
**MasjidLink AI Team** 🤖🕌
