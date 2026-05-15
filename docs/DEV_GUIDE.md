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
    dkmToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /programs', () => {
    it('pengurus dapat membuat proposal baru', async () => {
      const dto = {
        title: 'Program Beasiswa Santri',
        category: 'pendidikan',
        description: 'Program beasiswa untuk santri dhuafa',
        budgetPlan: 15_000_000,
        fundCategory: 'infaq_muthlaqa',
        startDate: '2026-07-01',
        endDate: '2026-09-30',
      };

      const res = await request(app.getHttpServer())
        .post('/programs')
        .set('Authorization', `Bearer ${dkmToken}`)
        .send(dto)
        .expect(201);

      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.title).toBe(dto.title);
      expect(res.body.data.masjidId).toBe(masjidId);
    });

    it('jamaah tidak dapat membuat proposal', async () => {
      const jamaahToken = await loginAsJamaah(app);
      
      await request(app.getHttpServer())
        .post('/programs')
        .set('Authorization', `Bearer ${jamaahToken}`)
        .send({ title: 'Test' })
        .expect(403);
    });
  });
});
```

### 4.4 E2E Testing (5 User Journey Utama)

```typescript
// e2e/user-journeys/donation-flow.e2e.spec.ts
// Menggunakan Playwright untuk simulasi browser nyata

import { test, expect } from '@playwright/test';

test.describe('Alur Donasi Program', () => {
  test('donatur dapat mendonasi ke program dan menerima bukti', async ({ page }) => {
    // 1. Login sebagai donatur
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'donatur@test.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-btn"]');
    await expect(page).toHaveURL('/dashboard/donatur');

    // 2. Cari program
    await page.fill('[data-testid="search-input"]', 'beasiswa');
    await page.click('[data-testid="search-btn"]');
    await expect(page.locator('[data-testid="program-card"]').first()).toBeVisible();

    // 3. Buka detail program & donasi
    await page.click('[data-testid="program-card"]');
    await page.click('[data-testid="donate-btn"]');

    // 4. Input nominal
    await page.click('[data-testid="amount-100000"]');
    await page.click('[data-testid="payment-qris"]');
    await page.click('[data-testid="confirm-donate"]');

    // 5. Verifikasi redirect ke halaman pembayaran
    await expect(page.locator('[data-testid="payment-page"]')).toBeVisible();
    
    // 6. Simulasi payment callback (Midtrans sandbox)
    // ... (mock Midtrans sandbox response)

    // 7. Verifikasi bukti donasi
    await expect(page.locator('[data-testid="donation-receipt"]')).toBeVisible();
    await expect(page.locator('[data-testid="receipt-amount"]')).toContainText('100.000');
  });
});
```

**5 E2E Journey yang wajib ada:**
1. Registrasi pengguna baru (3 role berbeda)
2. Alur donasi program end-to-end
3. Pengurus buat proposal → approval → input LPJ
4. Pencarian masjid berdasarkan lokasi
5. Generate dan unduh laporan keuangan PSAK 109

### 4.5 Menjalankan Test

```bash
# Unit test semua service
npm run test

# Unit test dengan watch mode (development)
npm run test:watch

# Coverage report (generate HTML di coverage/)
npm run test:coverage

# Integration test (memerlukan DB test)
npm run test:integration

# E2E test (memerlukan app berjalan)
npm run dev &
npm run test:e2e

# Test service tertentu saja
npm run test --filter=finance-service
npm run test --filter=program-service

# Test satu file
npx jest src/programs/programs.service.spec.ts

# Test dengan verbose output
npx jest --verbose
```

---

## 5. Deployment Guide

### 5.1 Environment

| Environment | Branch | Auto Deploy | URL |
|-------------|--------|-------------|-----|
| Development | lokal | ❌ | localhost:3000 |
| Staging | `develop` | ✅ | staging.masjidlink.id |
| Production | `main` | ✅ (+ approval) | masjidlink.id |

### 5.2 CI/CD Pipeline Detail

```yaml
# .github/workflows/deploy.yml (ringkasan)

name: CI/CD Pipeline

on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [develop, main]

jobs:
  quality-check:
    steps:
      - checkout
      - setup-node 20
      - npm ci
      - npm run lint          # ESLint check
      - npm run type-check    # TypeScript strict check
      - npm run test          # Unit tests
      - upload coverage to Codecov

  build:
    needs: quality-check
    steps:
      - Build Docker images untuk semua services
      - Tag dengan git SHA: masjidlink/api-gateway:abc1234
      - Push ke AWS ECR

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/develop'
    steps:
      - kubectl set image deployment/api-gateway ...
      - kubectl rollout status deployment/api-gateway
      - Run smoke tests terhadap staging

  deploy-production:
    needs: [build, deploy-staging]
    if: github.ref == 'refs/heads/main'
    environment: production      # ← Butuh manual approval di GitHub
    steps:
      - Kirim notifikasi ke Slack #deployments
      - kubectl apply --record
      - Canary deployment: 10% traffic dulu
      - Monitor error rate 5 menit
      - Jika OK → full rollout
      - Jika error → otomatis rollback
```

### 5.3 Deployment Manual (Emergency Hotfix)

```bash
# HANYA untuk P0/P1 incident — selalu info ke tim dulu di Slack

# 1. Buat hotfix branch dari main
git checkout main && git pull
git checkout -b hotfix/deskripsi-singkat

# 2. Perbaiki bug, commit, push
git commit -m "fix: perbaiki [deskripsi singkat]"
git push origin hotfix/deskripsi-singkat

# 3. Buat PR ke MAIN langsung (bukan develop)
# → Minta review darurat di Slack #engineering

# 4. Setelah merge, segera cherry-pick ke develop
git checkout develop
git cherry-pick <commit-sha>
git push origin develop
```

### 5.4 Database Migration dalam Deployment

```bash
# Migrasi berjalan OTOMATIS sebelum deployment di CI/CD
# Urutan: migrate DB → deploy service baru → smoke test

# Membuat migrasi baru
npm run migration:generate --name=add_column_programs_priority

# Jalankan migrasi secara manual (development)
npm run migration:run

# Rollback migrasi terakhir
npm run migration:revert

# PENTING: Semua migrasi harus BACKWARD COMPATIBLE
# Contoh cara aman:
# ✅ Tambah kolom nullable dulu, isi data, baru set NOT NULL di migrasi berikutnya
# ❌ Jangan rename / drop kolom yang masih dipakai kode lama
```

### 5.5 Rollback Deployment

```bash
# Lihat riwayat deployment
kubectl rollout history deployment/api-gateway -n masjidlink-prod

# Rollback ke revision sebelumnya
kubectl rollout undo deployment/api-gateway -n masjidlink-prod

# Rollback ke revision spesifik
kubectl rollout undo deployment/api-gateway --to-revision=5 -n masjidlink-prod

# Verifikasi rollback
kubectl rollout status deployment/api-gateway -n masjidlink-prod
```

---

## 6. Struktur Kode Tiap Service

Setiap service backend menggunakan modul berikut secara konsisten:

```typescript
// Setiap module.ts harus mendaftarkan:
@Module({
  imports: [
    TypeOrmModule.forFeature([EntityClass]),   // DB entities
    EventBusModule,                            // Redis event bus
    ConfigModule,                              // Env vars
  ],
  controllers: [FeatureController],
  providers: [
    FeatureService,
    FeatureRepository,
    // Guards, pipes, interceptors khusus module ini
  ],
  exports: [FeatureService],                   // Export bila dibutuhkan module lain
})
export class FeatureModule {}
```

---

## 7. Panduan Database & Migration

### 7.1 Aturan Penulisan Migration

```typescript
// BENAR: Migrasi yang backward compatible
export class AddPriorityToPrograms1234567890 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Tambah kolom nullable dulu
    await queryRunner.addColumn('programs', new TableColumn({
      name: 'priority',
      type: 'integer',
      isNullable: true,         // ← nullable dulu
      default: null,
    }));
    
    // Isi default value untuk data lama
    await queryRunner.query(`UPDATE programs SET priority = 5 WHERE priority IS NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('programs', 'priority');
  }
}

// SALAH: Jangan buat migrasi yang tidak bisa di-revert
async up(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.dropTable('old_programs');  // ← tidak bisa di-undo!
}
```

### 7.2 Aturan Query

```typescript
// ✅ BENAR: Gunakan parameterized query
await queryRunner.query(
  `SELECT * FROM programs WHERE masjid_id = $1 AND status = $2`,
  [masjidId, status]
);

// ❌ SALAH: String interpolation langsung (SQL injection vulnerability)
await queryRunner.query(
  `SELECT * FROM programs WHERE masjid_id = '${masjidId}'`
);
```

---

## 8. Panduan Error Handling

### 8.1 Hierarki Custom Error

```typescript
// common/errors/base.error.ts

export class MasjidLinkError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: number = 500,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Domain errors
export class InvalidStateTransitionError extends MasjidLinkError {
  constructor(message: string) {
    super(message, 'INVALID_STATE_TRANSITION', 422);
  }
}

export class SyariahViolationError extends MasjidLinkError {
  constructor(message: string) {
    super(message, 'SYARIAH_VIOLATION', 422);
  }
}

export class InsufficientFundsError extends MasjidLinkError {
  constructor(fundCategory: string, required: number, available: number) {
    super(
      `Dana ${fundCategory} tidak mencukupi. Dibutuhkan: Rp ${required.toLocaleString()}, ` +
      `tersedia: Rp ${available.toLocaleString()}`,
      'INSUFFICIENT_FUNDS',
      422,
    );
  }
}
```

### 8.2 Global Exception Filter

```typescript
// common/filters/global-exception.filter.ts

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx    = host.switchToHttp();
    const res    = ctx.getResponse<Response>();
    const req    = ctx.getRequest<Request>();

    let status  = 500;
    let code    = 'INTERNAL_ERROR';
    let message = 'Terjadi kesalahan internal. Silakan coba lagi.';

    if (exception instanceof MasjidLinkError) {
      status  = exception.httpStatus;
      code    = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      status  = exception.getStatus();
      code    = 'HTTP_ERROR';
      message = exception.message;
    }

    // Log error (JANGAN log data sensitif)
    this.logger.error(`${req.method} ${req.path} → ${status}: ${code}`, {
      userId: req.user?.id,
      code,
      status,
    });

    res.status(status).json({
      success: false,
      error: { code, message },
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  }
}
```

---

## 9. Review Checklist

Reviewer wajib cek semua item ini sebelum approve PR:

### Fungsionalitas
- [ ] Logika bisnis sesuai dengan `BUSINESS_RULES.md`
- [ ] State machine transitions valid
- [ ] Edge cases ditangani (null, empty, boundary values)

### Keamanan
- [ ] Tidak ada hardcoded secret / credential
- [ ] Input divalidasi di level DTO
- [ ] Role check ada di semua endpoint yang memerlukan
- [ ] Tidak ada SQL injection vulnerability
- [ ] Data sensitif tidak di-log

### Kode & Standar
- [ ] Mengikuti naming convention
- [ ] Fungsi tidak lebih dari 50 baris
- [ ] Tidak ada `any` TypeScript tanpa justifikasi
- [ ] Tidak ada `console.log` yang tersisa
- [ ] Semua TODO dihapus atau dijadikan issue

### Testing
- [ ] Unit test untuk semua logika bisnis baru
- [ ] Test untuk skenario error / edge case
- [ ] Coverage tidak menurun dari sebelumnya

### Database
- [ ] Migrasi backward compatible
- [ ] Indeks dibuat untuk kolom yang di-query
- [ ] Tidak ada N+1 query problem

### Dokumentasi
- [ ] JSDoc untuk fungsi publik
- [ ] Swagger annotation diperbarui
- [ ] CHANGELOG diperbarui jika ada breaking change

---

*Pertanyaan tentang panduan ini? Tanyakan di channel Slack #engineering atau buat issue di GitHub.*  
**MasjidLink Engineering Team** 🚀
