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
   → Update kebijakan keamanan
   → Pelatihan tim
```

### 6.4 Kontak Darurat

```
On-Call Engineer:   Lihat PagerDuty schedule
Tech Lead:          [nama] — [nomor HP] — [Slack]
DevOps Lead:        [nama] — [nomor HP] — [Slack]  
CEO:                [nama] — [nomor HP] (hanya P0)
Legal/Compliance:   [nama] — [email]
Anthropic Support:  https://support.anthropic.com (jika Claude API terdampak)
AWS Support:        https://console.aws.amazon.com/support (Plan: Business)
Midtrans Support:   +62-21-39501630 (jika payment terdampak)
```

---

## 7. Backup & Recovery

### 7.1 Backup Strategy

| Komponen | Metode | Frekuensi | Retensi | Lokasi |
|----------|--------|-----------|---------|--------|
| PostgreSQL | pg_dump + WAL streaming | Kontinu (PITR) | 7 hari | S3 ap-southeast-1 |
| PostgreSQL | Full snapshot | Harian 02:00 WIB | 30 hari | S3 ap-southeast-1 |
| PostgreSQL | Weekly snapshot | Mingguan | 12 bulan | S3 Glacier |
| Redis | RDB + AOF | Setiap 1 jam | 48 jam | S3 |
| S3 (media) | Cross-region replication | Real-time | Permanen | S3 ap-southeast-3 |
| Kubernetes configs | Git (infra/k8s) | Setiap commit | Permanen | GitHub |
| Secret | AWS Secrets Manager | Auto-versioning | 30 versi | AWS |

### 7.2 Backup Verification

```bash
# Test restore backup secara otomatis setiap Minggu (cron job)
# scripts/verify-backup.sh

#!/bin/bash
set -e

DATE=$(date +%Y-%m-%d)
BACKUP_FILE="s3://masjidlink-backups/daily/${DATE}/masjidlink-prod.dump"
TEST_DB="masjidlink_backup_test"

echo "=== Verifikasi Backup ${DATE} ==="

# 1. Unduh backup
aws s3 cp ${BACKUP_FILE} /tmp/test-backup.dump

# 2. Restore ke DB test
psql -c "DROP DATABASE IF EXISTS ${TEST_DB};"
psql -c "CREATE DATABASE ${TEST_DB};"
pg_restore -d ${TEST_DB} /tmp/test-backup.dump

# 3. Validasi integritas data
PROGRAM_COUNT=$(psql -d ${TEST_DB} -t -c "SELECT COUNT(*) FROM programs;")
TRANSACTION_COUNT=$(psql -d ${TEST_DB} -t -c "SELECT COUNT(*) FROM transactions;")

echo "✓ Programs restored: ${PROGRAM_COUNT}"
echo "✓ Transactions restored: ${TRANSACTION_COUNT}"

# 4. Kirim laporan ke Slack
curl -X POST ${SLACK_WEBHOOK} \
  -d "{\"text\": \"✅ Backup verification ${DATE}: ${PROGRAM_COUNT} programs, ${TRANSACTION_COUNT} transactions\"}"

# 5. Cleanup
psql -c "DROP DATABASE ${TEST_DB};"
rm /tmp/test-backup.dump
```

### 7.3 Recovery Time Objective (RTO) & Recovery Point Objective (RPO)

| Skenario | RTO | RPO | Prosedur |
|----------|-----|-----|----------|
| Single pod crash | 2 menit | 0 (stateless) | Kubernetes auto-restart |
| Database corruption | 2 jam | 1 jam | Restore dari PITR backup |
| Full AZ failure | 30 menit | 0 (multi-AZ RDS) | Automatic failover |
| Full region failure | 4 jam | 1 jam | Manual failover ke region backup |
| Complete data loss | 8 jam | 24 jam | Restore dari daily backup |

### 7.4 Prosedur Disaster Recovery

```bash
# RUNBOOK DR-001: Restore database dari backup

# Langkah 1: Tentukan titik waktu restore
# Cek PITR availability
aws rds describe-db-instances \
  --db-instance-identifier masjidlink-prod-db \
  --query 'DBInstances[0].LatestRestorableTime'

# Langkah 2: Restore ke instance baru
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier masjidlink-prod-db \
  --target-db-instance-identifier masjidlink-restored-YYYYMMDD \
  --restore-time 2026-05-15T10:00:00Z \
  --db-instance-class db.t3.medium

# Langkah 3: Tunggu instance siap (sekitar 30 menit)
aws rds wait db-instance-available \
  --db-instance-identifier masjidlink-restored-YYYYMMDD

# Langkah 4: Verifikasi data
psql -h [restored-endpoint] -U masjidlink -d masjidlink -c "SELECT COUNT(*) FROM transactions;"

# Langkah 5: Update connection string di Secrets Manager
# Langkah 6: Rolling restart semua services
kubectl rollout restart deployment -n masjidlink-prod

# Langkah 7: Verifikasi semua services healthy
kubectl get pods -n masjidlink-prod
```

---

## 8. Monitoring & Alerting

### 8.1 Metrics yang Dipantau

#### Infrastructure Metrics (Grafana + Prometheus)

```yaml
# Alert rules — alerts.yaml

groups:
  - name: masjidlink-critical
    rules:
      - alert: ServiceDown
        expr: up{job=~"masjidlink-.*"} == 0
        for: 1m
        labels: { severity: critical }
        annotations:
          summary: "Service {{ $labels.job }} DOWN"
          description: "Service sudah down selama 1 menit. SEGERA cek!"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels: { severity: critical }
        annotations:
          summary: "Error rate > 5% di {{ $labels.service }}"

      - alert: DatabaseConnectionPoolExhausted
        expr: pg_stat_database_numbackends / pg_settings_max_connections > 0.85
        for: 2m
        labels: { severity: warning }
        annotations:
          summary: "DB connection pool hampir penuh ({{ $value | humanizePercentage }})"

      - alert: HighMemoryUsage
        expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.85
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: "Memory usage tinggi di {{ $labels.container }}"

      - alert: SlowAPIResponse
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: "P95 response time > 2 detik"

      - alert: DiskSpaceRunningLow
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.15
        for: 10m
        labels: { severity: warning }
        annotations:
          summary: "Disk space tersisa < 15%"
```

#### Business Metrics (Metabase Dashboard)

```sql
-- Dashboard: Metrik bisnis real-time

-- 1. Donasi hari ini
SELECT 
  COUNT(*) as count,
  SUM(amount) as total
FROM donations
WHERE payment_status = 'paid'
  AND donated_at >= CURRENT_DATE;

-- 2. Program aktif per masjid
SELECT 
  m.name as masjid,
  COUNT(p.id) as active_programs
FROM masjids m
LEFT JOIN programs p ON p.masjid_id = m.id AND p.status = 'running'
GROUP BY m.name
ORDER BY active_programs DESC
LIMIT 20;

-- 3. Anomali transaksi hari ini
SELECT COUNT(*) 
FROM ai_anomaly_logs 
WHERE risk_level IN ('medium', 'high')
  AND detected_at >= CURRENT_DATE;
```

### 8.2 Alert Channels

```yaml
# Routing alert berdasarkan severity
routes:
  - match: { severity: critical }
    receiver: pagerduty-oncall     # Bangunkan on-call engineer
    repeat_interval: 5m

  - match: { severity: warning }
    receiver: slack-alerts         # Notifikasi di Slack #alerts
    repeat_interval: 1h

  - match: { severity: info }
    receiver: slack-info           # Slack #monitoring-info
    repeat_interval: 24h

# PagerDuty untuk P0/P1
# Slack untuk P2/P3
# Email digest harian untuk semua
```

### 8.3 Log Management

```typescript
// Standar format log (ELK Stack)
// SEMUA log harus mengikuti format ini

interface LogEntry {
  timestamp: string;     // ISO 8601
  level: 'error' | 'warn' | 'info' | 'debug';
  service: string;       // Nama service
  traceId: string;       // Untuk tracing request lintas service
  userId?: string;       // Jika tersedia (BUKAN email/phone)
  masjidId?: string;
  message: string;
  meta?: Record<string, unknown>;  // Data tambahan (sudah di-mask)
}

// Contoh log yang BENAR
logger.info('Program approved', {
  service: 'program-service',
  traceId: req.headers['x-trace-id'],
  userId: req.user.id,
  masjidId: req.user.masjidId,
  programId: program.id,
  approvedBy: approver.id,
});

// Contoh log yang SALAH (mengekspos data sensitif)
logger.info(`User ${user.email} approved program`);  // ❌ email di log
logger.info(`Amount: ${transaction.amount} from ${transaction.donorPhone}`);  // ❌ phone di log
```

### 8.4 Uptime Monitoring

```yaml
# Uptime Robot / Betterstack checks
checks:
  - name: API Gateway Health
    url: https://api.masjidlink.id/health
    interval: 60s
    timeout: 10s
    alert_if_down_for: 3m

  - name: Web Portal
    url: https://masjidlink.id
    interval: 60s

  - name: Payment Webhook
    url: https://api.masjidlink.id/donations/health
    interval: 5m

  - name: Database Connection
    type: tcp
    host: [db-internal-host]
    port: 5432
    interval: 60s
```

---

## 9. Runbook — Prosedur Operasional

### RUNBOOK-001: Service Tidak Merespons

```bash
# Gejala: API Gateway return 502/503 / timeout

# 1. Cek status pods
kubectl get pods -n masjidlink-prod
# Lihat: STATUS, RESTARTS, AGE

# 2. Jika pod CrashLoopBackOff atau Error
kubectl describe pod [pod-name] -n masjidlink-prod
kubectl logs [pod-name] -n masjidlink-prod --previous  # Log sebelum crash

# 3. Jika pod Pending
kubectl describe pod [pod-name] -n masjidlink-prod
# Biasanya: insufficient resources atau image pull error

# 4. Force restart service
kubectl rollout restart deployment/[service-name] -n masjidlink-prod
kubectl rollout status deployment/[service-name] -n masjidlink-prod

# 5. Jika tidak membaik → rollback
kubectl rollout undo deployment/[service-name] -n masjidlink-prod
```

### RUNBOOK-002: Database Lambat / Tinggi CPU

```bash
# 1. Cek slow queries
psql -h [db-host] -U masjidlink -d masjidlink -c "
  SELECT query, calls, mean_exec_time, total_exec_time
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;"

# 2. Cek active connections
psql -c "
  SELECT pid, usename, application_name, state, query
  FROM pg_stat_activity
  WHERE state != 'idle'
  ORDER BY query_start;"

# 3. Kill query yang stuck (ganti PID)
psql -c "SELECT pg_terminate_backend(PID);"

# 4. Cek locks
psql -c "
  SELECT pid, relation::regclass, mode, granted
  FROM pg_locks l
  JOIN pg_class c ON c.oid = l.relation
  WHERE NOT granted;"
```

### RUNBOOK-003: Redis Memory Penuh

```bash
# Gejala: OOM errors / slow response dari cache

# 1. Cek penggunaan memory
redis-cli -h [redis-host] INFO memory | grep used_memory_human

# 2. Lihat distribusi key terbesar
redis-cli --bigkeys

# 3. Hapus key yang expired (manual trigger)
redis-cli DEBUG SLEEP 0

# 4. Jika darurat: flush cache (HATI-HATI di production)
# Ini akan menyebabkan cold start semua service
redis-cli -h [redis-host] FLUSHDB ASYNC  # Hanya flush DB tertentu, bukan semua

# 5. Scale up Redis node di AWS ElastiCache
```

### RUNBOOK-004: Donasi Gagal / Payment Bermasalah

```bash
# Gejala: User report donasi tidak masuk / status stuck

# 1. Cek log donation-service
kubectl logs -n masjidlink-prod -l app=donation-service --since=1h | grep ERROR

# 2. Cek status di Midtrans Dashboard
# → https://dashboard.midtrans.com → Transaksi → cari by order_id

# 3. Cek webhook masuk
kubectl logs -n masjidlink-prod -l app=donation-service --since=1h | grep "webhook"

# 4. Manual trigger webhook check (jika webhook gagal terkirim)
curl -X POST https://api.midtrans.com/v2/[order-id]/status \
  -H "Authorization: Basic [server-key-base64]"

# 5. Manual update status di DB (hanya jika Midtrans confirm paid)
psql -c "
  UPDATE donations
  SET payment_status = 'paid', updated_at = NOW()
  WHERE midtrans_order_id = '[order-id]'
  AND payment_status = 'pending';"
# → Kemudian manual trigger event donation.paid ke finance-service
```

### RUNBOOK-005: Kebocoran Memory (Memory Leak)

```bash
# Gejala: Memory pod terus naik, tidak turun setelah request

# 1. Monitor memory trend
kubectl top pods -n masjidlink-prod --sort-by=memory

# 2. Ambil heap dump (Node.js)
kubectl exec -n masjidlink-prod [pod-name] -- \
  node -e "require('v8').writeHeapSnapshot('/tmp/heap.heapsnapshot')"
kubectl cp masjidlink-prod/[pod-name]:/tmp/heap.heapsnapshot ./heap.heapsnapshot

# 3. Analisis di Chrome DevTools Memory tab

# 4. Sementara: tambah memory limit & restart
kubectl set resources deployment/[service] \
  -c=[service] \
  --limits=memory=1Gi \
  -n masjidlink-prod

kubectl rollout restart deployment/[service] -n masjidlink-prod
```

---

## 10. Vulnerability Disclosure

### 10.1 Bug Bounty Program

MasjidLink menjalankan program responsible disclosure. Jika menemukan kerentanan keamanan:

**Scope yang berlaku:**
- api.masjidlink.id
- masjidlink.id
- app.masjidlink.id

**Cara pelaporan:**
1. Email ke: security@masjidlink.id
2. Enkripsi menggunakan PGP key publik (tersedia di website)
3. Sertakan: deskripsi vulnerability, langkah reproduksi, dampak potensial

**Yang kami harapkan:**
- Tidak mengeksploitasi vulnerability untuk akses data nyata
- Tidak melakukan DOS / scan berlebihan
- Tidak mengekspos vulnerability ke publik sebelum diperbaiki (90 hari)

**Respon kami:**
- Acknowledgment dalam 48 jam
- Update progress setiap 7 hari
- Kredit di Hall of Fame setelah fix (jika researcher mau)

**Di luar scope:**
- Social engineering terhadap karyawan
- Physical attack
- Volumetric DoS

---

*Dokumen ini bersifat INTERNAL. Jangan bagikan ke pihak di luar tim MasjidLink.*  
*Perbarui dokumen ini setiap ada perubahan prosedur atau infrastruktur.*

**Hubungi:** security@masjidlink.id | **On-Call:** Lihat PagerDuty  
**MasjidLink DevOps & Security Team** 🛡️🕌
