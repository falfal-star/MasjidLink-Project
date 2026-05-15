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

    // Kirim notifikasi ke donatur
    await eventBus.publish('donation.program_cancelled', {
      donationId: donation.id,
      donorId: donation.donorId,
      amount: donation.amount,
      refundDeadline: addDays(new Date(), 14),
    });
  }

  // Jadwalkan otomatis konversi ke infaq setelah 14 hari
  await scheduleJob('convert_held_donations', addDays(new Date(), 14), { programId });
}
```

---

## 8. Aturan Dana ZISWAF

*Lihat juga: `COMPLIANCE.md` untuk dasar syariah lengkap.*

### 8.1 Matriks Penggunaan Dana

| Kategori Dana | Boleh Digunakan Untuk | Tidak Boleh Untuk |
|---------------|----------------------|-------------------|
| `zakat_maal` | Program bantuan sosial, beasiswa dhuafa, kesehatan mustahiq, pemberdayaan ekonomi mustahiq | Operasional masjid (listrik, air), infrastruktur masjid non-asnaf, program umum |
| `zakat_fitrah` | Disalurkan langsung ke fakir/miskin sebelum shalat Idul Fitri | Disimpan setelah Idul Fitri melewati 1 bulan |
| `infaq_muqayyad` | Sesuai ikrar pemberi saja | Tujuan lain tanpa izin pemberi |
| `infaq_muthlaqa` | Program apapun, operasional masjid | — |
| `shodaqoh` | Program apapun, operasional masjid | — |
| `wakaf_tunai` | Investasi produktif (pokok harus utuh), hasil sesuai ikrar | Mengurangi pokok wakaf |
| `wakaf_aset` | Manfaat sesuai ikrar wakif | Dijual, dihibahkan, dipindahtangankan |
| `hibah` | Sesuai akad hibah | Melanggar syarat hibah |

```typescript
// BR-ZISWAF-001: Validasi penggunaan dana
const ALLOWED_PROGRAM_CATEGORIES: Record<FundCategory, ProgramCategory[]> = {
  zakat_maal: [
    ProgramCategory.BANTUAN_SOSIAL,
    ProgramCategory.BEASISWA_DHUAFA,
    ProgramCategory.KESEHATAN_DHUAFA,
    ProgramCategory.PEMBERDAYAAN_EKONOMI,
  ],
  zakat_fitrah: [
    ProgramCategory.BANTUAN_SOSIAL, // hanya untuk fakir/miskin
  ],
  infaq_muqayyad:  [], // validasi manual berdasarkan ikrar
  infaq_muthlaqa:  Object.values(ProgramCategory),
  shodaqoh:        Object.values(ProgramCategory),
  wakaf_tunai:     [ProgramCategory.INVESTASI_PRODUKTIF],
  wakaf_aset:      [ProgramCategory.MANFAAT_WAKAF],
  hibah:           Object.values(ProgramCategory),
};

function validateFundUsageForProgram(
  fundCategory: FundCategory,
  programCategory: ProgramCategory,
): void {
  const allowed = ALLOWED_PROGRAM_CATEGORIES[fundCategory];
  if (allowed.length > 0 && !allowed.includes(programCategory)) {
    throw new SyariahViolationError(
      `Dana '${fundCategory}' tidak dapat digunakan untuk program kategori '${programCategory}'. ` +
      `Kategori yang diizinkan: ${allowed.join(', ')}. ` +
      `Rujuk COMPLIANCE.md untuk penjelasan syariah.`
    );
  }
}
```

### 8.2 Aturan Hak Amil

> **BR-ZISWAF-002:** Persentase hak amil dari dana zakat **tidak boleh melebihi 12,5%** (1/8 dari total zakat yang diterima) — sesuai mazhab Syafi'i yang menjadi rujukan mayoritas Muslim Indonesia.  
> **BR-ZISWAF-003:** Sistem secara otomatis menghitung dan memindahkan hak amil ke sub-akun `dana_amil` setiap kali ada penerimaan zakat.  
> **BR-ZISWAF-004:** Jika DKM mengonfigurasi persentase amil di atas 12,5%, sistem menolak konfigurasi tersebut dan menampilkan peringatan syariah.  
> **BR-ZISWAF-005:** Dana wakaf tunai pokok **tidak boleh berkurang**. Sistem memblokir pengeluaran dari pokok wakaf. Yang bisa digunakan hanya hasil/keuntungan dari investasi pokok wakaf.

---

## 9. Aturan Laporan Keuangan

### 9.1 Publikasi Laporan

> **BR-RPT-001:** Laporan keuangan bulanan otomatis dipublikasikan ke halaman publik masjid pada hari ke-5 bulan berikutnya.  
> **BR-RPT-002:** Sebelum dipublikasikan, sistem melakukan validasi otomatis: total pemasukan = Σ transaksi income, total pengeluaran = Σ transaksi expense, saldo akhir = saldo awal + pemasukan - pengeluaran. Jika validasi gagal, laporan ditahan dan DKM diberi notifikasi.  
> **BR-RPT-003:** Laporan yang sudah dipublikasikan **tidak dapat dihapus**, hanya dapat ditambahkan catatan koreksi (addendum).  
> **BR-RPT-004:** Laporan PSAK 109 kuartalan dapat dipublikasikan atau disimpan privat — keputusan ada di tangan DKM. Jika disimpan privat, tetap bisa diakses oleh auditor yang diberi akses oleh DKM.

### 9.2 Akses Laporan

> **BR-RPT-005:** Laporan bulanan publik dapat diakses oleh siapapun tanpa login, namun data hanya menampilkan total per kategori (bukan daftar transaksi individual).  
> **BR-RPT-006:** Daftar transaksi individual (detail) hanya bisa diakses oleh pengurus masjid tersebut dan admin MasjidLink.  
> **BR-RPT-007:** Donatur yang pernah mendonasi ke suatu masjid mendapat akses ke laporan penggunaan dana yang lebih detail (breakdown per program) — namun tetap tidak bisa melihat identitas donatur lain.

### 9.3 Retensi Data Keuangan

> **BR-RPT-008:** Data transaksi keuangan disimpan **minimum 10 tahun** sesuai kewajiban hukum akuntansi dan audit.  
> **BR-RPT-009:** Jika masjid menutup akun MasjidLink, data keuangan tetap tersimpan dan dapat diakses oleh pengurus selama masa retensi. Setelah 10 tahun, data dianonimkan.

---

## 10. Aturan Notifikasi

### 10.1 Matrik Trigger Notifikasi

| Event | Penerima | Channel | Prioritas |
|-------|----------|---------|-----------|
| Proposal baru diajukan | Ketua DKM masjid tersebut | Push + WhatsApp | Tinggi |
| Proposal disetujui | Pengaju proposal | Push + Email | Sedang |
| Proposal ditolak | Pengaju proposal | Push + Email + WhatsApp | Tinggi |
| Program mulai berjalan | Jamaah yang mendaftar ikut | Push | Rendah |
| LPJ dipublikasikan | Donatur yang mendonasi ke program itu | Push + Email | Sedang |
| Donasi berhasil | Donatur | Email + Push | Tinggi |
| Donasi gagal | Donatur | Push + Email | Tinggi |
| Anggaran program mencapai 80% | Penanggung jawab program | Push | Sedang |
| Anggaran program mencapai 100% | Ketua DKM + Bendahara | Push + WhatsApp | Tinggi |
| Anomali keuangan terdeteksi | Ketua DKM + Bendahara | WhatsApp + Email | Sangat Tinggi |
| Verifikasi masjid disetujui | Pendaftar masjid | Email + Push | Tinggi |
| Verifikasi masjid ditolak | Pendaftar masjid | Email + Push | Tinggi |
| LPJ melewati deadline | Ketua DKM | Push + WhatsApp | Tinggi |
| Program baru di masjid favorit | Follower masjid | Push | Rendah |

### 10.2 Aturan Pembatasan Notifikasi

> **BR-NOTIF-001:** Maksimal **5 push notification per hari** per pengguna dari MasjidLink (kecuali kategori "Sangat Tinggi" dan transaksi keuangan yang selalu terkirim).  
> **BR-NOTIF-002:** WhatsApp notification hanya dikirim untuk event dengan prioritas Tinggi atau Sangat Tinggi, dan maksimal **3 pesan WhatsApp per hari** per pengguna.  
> **BR-NOTIF-003:** Pengguna dapat menonaktifkan notifikasi per kategori melalui pengaturan akun, kecuali notifikasi keamanan (anomali, login mencurigakan) yang tidak bisa dinonaktifkan.  
> **BR-NOTIF-004:** Notifikasi tidak dikirim antara pukul **22:00 – 06:00 WIB** kecuali kategori prioritas "Sangat Tinggi" (anomali keuangan, keamanan akun).

---

## 11. Aturan AI & Rekomendasi

> **BR-AI-001:** Semua respons dari AI (chatbot, rekomendasi, prediksi) harus dilabeli dengan tanda bahwa konten tersebut dihasilkan oleh AI — pengguna harus bisa membedakan konten AI dari konten manusia.  
> **BR-AI-002:** Chatbot **tidak boleh** membuat keputusan yang bersifat final (approval, transaksi, penghapusan data). Chatbot hanya bisa memberikan informasi dan draft yang masih harus dikonfirmasi oleh pengguna.  
> **BR-AI-003:** Riwayat percakapan chatbot disimpan maksimal **90 hari**, kemudian dianonimkan untuk keperluan pelatihan model.  
> **BR-AI-004:** Konten yang dihasilkan AI untuk draft proposal atau LPJ harus **dimodifikasi** oleh pengurus sebelum di-submit — sistem mencegah submit draft AI secara verbatim tanpa ada perubahan (deteksi berdasarkan similarity score > 95%).  
> **BR-AI-005:** Rekomendasi program untuk donatur **tidak boleh** mengekspos data donatur lain, nama donatur, atau jumlah donasi dari donatur lain.  
> **BR-AI-006:** Prediksi dana yang dihasilkan AI wajib menampilkan **interval kepercayaan** (confidence interval) — tidak boleh ditampilkan sebagai angka pasti.

---

## 12. Aturan Akun & Sesi

### 12.1 Registrasi Akun

> **BR-ACC-001:** Email dan nomor HP bersifat **unik** di seluruh sistem — satu email atau nomor HP hanya bisa terdaftar di satu akun.  
> **BR-ACC-002:** Email atau nomor HP wajib diverifikasi dalam **24 jam** setelah registrasi. Jika tidak diverifikasi, akun otomatis dihapus.  
> **BR-ACC-003:** Akun dengan role `pengurus` memerlukan verifikasi tambahan dari admin MasjidLink dalam **48 jam kerja** setelah dokumen masjid diunggah.

### 12.2 Sesi & Token

> **BR-ACC-004:** Access token berlaku **1 jam**. Refresh token berlaku **30 hari**.  
> **BR-ACC-005:** Refresh token hanya bisa digunakan **satu kali** — setiap kali digunakan, token lama diinvalidasi dan token baru diterbitkan (token rotation).  
> **BR-ACC-006:** Jika terdeteksi login dari perangkat/lokasi baru yang signifikan berbeda, sistem mengirim notifikasi ke email/HP terdaftar.  
> **BR-ACC-007:** Setelah **5 percobaan login gagal** berturut-turut dalam 15 menit, akun dikunci sementara selama 15 menit. Setelah **10 percobaan**, akun dikunci dan butuh reset password.  
> **BR-ACC-008:** Logout dari satu perangkat tidak memengaruhi sesi di perangkat lain (kecuali pengguna memilih "Keluar dari semua perangkat").

### 12.3 Penghapusan Akun

> **BR-ACC-009:** Penghapusan akun memerlukan konfirmasi via OTP ke email/HP terdaftar.  
> **BR-ACC-010:** Akun `pengurus` yang masih menjadi satu-satunya pengurus aktif di sebuah masjid **tidak bisa dihapus** sampai ada pengurus pengganti yang aktif.  
> **BR-ACC-011:** Data pribadi pengguna dianonimkan dalam **30 hari** setelah penghapusan akun. Data keuangan (transaksi, donasi) tetap tersimpan dalam bentuk anonim untuk keperluan laporan.

---

## 13. Aturan Konten & Moderasi

> **BR-CON-001:** Foto yang diunggah (profil masjid, dokumentasi program) diproses melalui **content moderation** otomatis menggunakan Google Cloud Vision API Safe Search. Konten yang terdeteksi mengandung kekerasan, konten dewasa, atau konten ofensif **otomatis ditolak**.  
> **BR-CON-002:** Nama masjid, nama program, dan deskripsi tidak boleh mengandung kata-kata yang termasuk dalam daftar kata terlarang (dikelola oleh admin MasjidLink).  
> **BR-CON-003:** Feedback / komentar jamaah terhadap program dimoderasi oleh sistem AI (sentiment analysis) dan dilaporkan ke DKM. Komentar tidak ditampilkan secara publik tanpa persetujuan DKM.  
> **BR-CON-004:** LPJ yang diunggah pengurus dapat di-flag oleh jamaah atau donatur jika ditemukan ketidaksesuaian. Jika ada 3 flag atau lebih, sistem mengirim notifikasi ke admin MasjidLink untuk review manual.

---

## 14. Edge Cases & Penanganan Pengecualian

### 14.1 Program Melewati Deadline Tanpa Selesai

**Kondisi:** `endDate` sudah lewat, status masih `RUNNING`.

**Penanganan:**
```
Hari 0 (endDate)     : Status otomatis berubah ke COMPLETED via cron
Hari 1-7             : Sistem kirim pengingat LPJ harian ke pengurus
Hari 8-14            : Pengingat dengan eskalasi ke Ketua DKM
Hari 15-30           : Status berubah ke LPJ_OVERDUE, notifikasi eskalasi
Hari 30+             : Admin MasjidLink dilibatkan untuk mediasi
```

### 14.2 Donatur Minta Refund Setelah Program Selesai

**BR-EDGE-001:** Refund setelah program `COMPLETED` tidak bisa dilakukan secara otomatis karena dana sudah tersalurkan. DKM harus dihubungi secara manual dan keputusan ada di tangan DKM sesuai prinsip syariah.

### 14.3 Masjid Memiliki Dua Ketua DKM Aktif

**BR-EDGE-002:** Sistem mengizinkan maksimal **2 akun** dengan sub-role `ketua` aktif per masjid. Jika ada penambahan ketua ketiga, salah satu dari yang sudah ada harus dinonaktifkan terlebih dahulu.

### 14.4 Webhook Midtrans Terlambat / Duplikat

**BR-EDGE-003:** Sistem menggunakan **idempotency key** berdasarkan `midtrans_order_id`. Jika webhook dengan `order_id` yang sama datang lebih dari sekali, hanya yang pertama diproses. Yang berikutnya diabaikan dan dicatat di log.

```typescript
async function handlePaymentWebhook(payload: MidtransWebhookPayload): Promise<void> {
  const idempotencyKey = `webhook:${payload.order_id}`;

  // Cek apakah sudah pernah diproses
  const alreadyProcessed = await redis.get(idempotencyKey);
  if (alreadyProcessed) {
    logger.warn(`Duplicate webhook ignored: ${payload.order_id}`);
    return; // Idempoten — tidak proses ulang
  }

  // Tandai sebagai sedang diproses (TTL 10 menit)
  await redis.setex(idempotencyKey, 600, 'processing');

  // Proses webhook
  await processDonationPayment(payload);

  // Tandai selesai (TTL 30 hari untuk mencegah duplikat jangka panjang)
  await redis.setex(idempotencyKey, 60 * 60 * 24 * 30, 'done');
}
```

### 14.5 Pengurus Mengajukan Proposal untuk Dirinya Sendiri

**BR-EDGE-004:** Jika pengaju proposal (`createdBy`) adalah orang yang sama dengan approver, sistem menolak approval tersebut dan menampilkan pesan: *"Anda tidak dapat menyetujui proposal yang Anda ajukan sendiri. Minta pengurus lain dengan role Ketua DKM untuk melakukan review."*

### 14.6 Saldo Dana Tidak Cukup Saat Program Akan Dimulai

**BR-EDGE-005:** Jika pada saat `startDate` tiba, saldo dana yang dialokasikan untuk program tidak mencukupi anggaran yang disetujui (karena ada pengeluaran lain setelah approval), program tetap berstatus `RUNNING` namun sistem mengirim alert ke Ketua DKM dan Bendahara dengan detail kekurangan dana.

### 14.7 Masjid Dihapus Saat Program Masih Aktif

**BR-EDGE-006:** Masjid tidak bisa dihapus jika masih ada program berstatus `RUNNING` atau `APPROVED`, atau ada donasi berstatus `PAID` yang belum dicatat ke laporan keuangan. Admin harus menyelesaikan semua transaksi aktif terlebih dahulu sebelum masjid bisa dihapus.

---

## Appendix: Kode Error Bisnis

| Kode Error | Pesan Default | HTTP Status |
|------------|--------------|-------------|
| `INVALID_STATE_TRANSITION` | Program tidak dapat berpindah ke status yang dituju | 422 |
| `SYARIAH_VIOLATION` | Penggunaan dana tidak sesuai ketentuan syariah | 422 |
| `INSUFFICIENT_FUNDS` | Saldo dana tidak mencukupi | 422 |
| `BUDGET_OVERRUN` | Pengeluaran melebihi anggaran yang disetujui | 422 |
| `APPROVAL_REQUIRED` | Aksi ini memerlukan persetujuan pihak berwenang | 403 |
| `TWO_FACTOR_REQUIRED` | Verifikasi 2FA diperlukan untuk aksi ini | 403 |
| `SELF_APPROVAL_FORBIDDEN` | Anda tidak dapat menyetujui pengajuan Anda sendiri | 403 |
| `DUPLICATE_WEBHOOK` | Webhook sudah pernah diproses | 200 (idempoten) |
| `PROPOSAL_LIMIT_EXCEEDED` | Batas maksimal proposal pending tercapai | 422 |
| `AMIL_PERCENTAGE_EXCEEDED` | Persentase amil melebihi batas syariah 12,5% | 422 |
| `WAKAF_PRINCIPAL_VIOLATION` | Pengeluaran tidak boleh mengurangi pokok wakaf | 422 |
| `INACTIVE_MASJID` | Masjid belum terverifikasi atau sedang suspended | 403 |
| `BACKDATING_LIMIT_EXCEEDED` | Tanggal transaksi melewati batas maksimal 90 hari | 422 |
| `EVIDENCE_REQUIRED` | Bukti transaksi wajib untuk pengeluaran > Rp 500.000 | 422 |

---

*Dokumen ini adalah sumber kebenaran tunggal (single source of truth) untuk semua aturan bisnis MasjidLink. Jika ada konflik antara implementasi kode dan dokumen ini, **dokumen ini yang berlaku** — kode harus disesuaikan.*

*Setiap perubahan aturan bisnis harus melalui review Product Owner dan disetujui sebelum diimplementasikan.*

**Pertanyaan:** product@masjidlink.id  
**MasjidLink Product & Engineering** 🕌
