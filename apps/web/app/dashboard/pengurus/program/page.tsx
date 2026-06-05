'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '../../../../utils/supabase/client';
import {
  BookOpen, Plus, Loader2, CheckCircle2, AlertCircle,
  Clock, CheckCircle, XCircle, X, ChevronDown, Sparkles
} from 'lucide-react';
import type { Program, ProgramStatus } from '../../../../lib/db/types';

const STATUS_FLOW: Record<ProgramStatus, { next: ProgramStatus | null; label: string; color: string }> = {
  draft:            { next: 'pending_approval', label: 'Draft',           color: 'bg-gray-100 text-gray-600' },
  pending_approval: { next: null,               label: 'Menunggu Approve', color: 'bg-amber-100 text-amber-700' },
  approved:         { next: 'completed',         label: 'Disetujui',       color: 'bg-emerald-100 text-emerald-700' },
  rejected:         { next: null,               label: 'Ditolak',          color: 'bg-rose-100 text-rose-700' },
  completed:        { next: null,               label: 'Selesai',          color: 'bg-blue-100 text-blue-700' },
};

export default function PengurusProgramPage() {
  const supabase = createClient();
  const [masjidId, setMasjidId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('pengurus');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({ title: '', description: '', budget: '', start_date: '', end_date: '' });

  const fetchPrograms = useCallback(async (mid: string) => {
    const { data } = await supabase
      .from('programs')
      .select('*, donations(amount, status)')
      .eq('masjid_id', mid)
      .order('created_at', { ascending: false });
    setPrograms(data ?? []);
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: roleData } = await supabase
        .from('user_masjid_roles')
        .select('masjid_id, role')
        .eq('user_id', user.id)
        .maybeSingle();
      if (roleData?.masjid_id) {
        setMasjidId(roleData.masjid_id);
        setUserRole(roleData.role);
        await fetchPrograms(roleData.masjid_id);
      }
      setLoading(false);
    };
    init();
  }, [supabase, fetchPrograms]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masjidId || !form.title) return;
    setSaving(true);
    setMessage(null);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('programs').insert({
      masjid_id: masjidId,
      created_by: user?.id,
      title: form.title,
      description: form.description || null,
      budget: form.budget ? Number(form.budget) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: 'draft',
    });
    if (error) {
      setMessage({ type: 'error', text: `Gagal: ${error.message}` });
    } else {
      setMessage({ type: 'success', text: `Program "${form.title}" berhasil dibuat.` });
      setForm({ title: '', description: '', budget: '', start_date: '', end_date: '' });
      setShowForm(false);
      await fetchPrograms(masjidId);
    }
    setSaving(false);
  };

  const handleStatusChange = async (prog: Program, newStatus: ProgramStatus) => {
    const { error } = await supabase
      .from('programs').update({ status: newStatus }).eq('id', prog.id);
    if (!error && masjidId) await fetchPrograms(masjidId);
  };

  const handleUpdateProgress = async (progId: string, progress: number, attendance: number) => {
    const { error } = await supabase
      .from('programs')
      .update({ execution_progress: progress, attendance_count: attendance })
      .eq('id', progId);
    if (!error && masjidId) {
      setMessage({ type: 'success', text: 'Progress program berhasil diperbarui.' });
      await fetchPrograms(masjidId);
    }
  };

  const handleGenerateLPJ = async (prog: Program) => {
    if (!masjidId) return;
    
    // Fetch semua pengeluaran untuk program ini
    const { data: txData } = await supabase
      .from('transactions')
      .select('amount, description, created_at')
      .eq('program_id', prog.id)
      .eq('type', 'pengeluaran');

    const expenses = txData ?? [];
    const totalExpense = expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const budget = Number(prog.budget || 0);
    
    const formattedBudget = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(budget);
    const formattedTotalExpense = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalExpense);
    const dateStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    let detailList = expenses.map((e, idx) => {
      const amt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(e.amount));
      return `${idx + 1}. ${e.description || 'Pengeluaran'} - ${amt}`;
    }).join('\n');

    if (expenses.length === 0) {
      detailList = '- (Belum ada catatan transaksi pengeluaran)';
    }

    const autoLPJ = `LAPORAN PERTANGGUNGJAWABAN (LPJ) PROGRAM

Nama Program : ${prog.title}
Status Program: Selesai (Completed)
Tanggal LPJ  : ${dateStr}

A. EVALUASI ANGGARAN
1. Anggaran Direncanakan : ${formattedBudget}
2. Realisasi Pengeluaran   : ${formattedTotalExpense}
3. Selisih (Varian)        : ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(budget - totalExpense)}

B. DATA PARTISIPASI
Jumlah Kehadiran Peserta: ${prog.attendance_count || 0} jamaah

C. RINCIAN PENGELUARAN AKTUAL
${detailList}

D. KESIMPULAN
Program ini telah terlaksana dengan tingkat kemajuan ${prog.execution_progress || 100}%. Seluruh pengeluaran telah diverifikasi dan dicatat pada sistem pembukuan keuangan syariah MasjidLink.`;

    const { error } = await supabase
      .from('programs')
      .update({ lpj_text: autoLPJ, status: 'completed', execution_progress: 100 })
      .eq('id', prog.id);

    if (!error) {
      setMessage({ type: 'success', text: 'LPJ berhasil dibuat otomatis dan status diubah ke Selesai.' });
      await fetchPrograms(masjidId);
    }
  };

  const handleUpdateLPJText = async (progId: string, text: string) => {
    const { error } = await supabase
      .from('programs')
      .update({ lpj_text: text })
      .eq('id', progId);
    if (!error && masjidId) {
      setMessage({ type: 'success', text: 'Naskah LPJ berhasil diperbarui.' });
      await fetchPrograms(masjidId);
    }
  };

  const handleTogglePublishLPJ = async (progId: string, currentPublished: boolean) => {
    const { error } = await supabase
      .from('programs')
      .update({ lpj_published: !currentPublished })
      .eq('id', progId);
    if (!error && masjidId) {
      setMessage({
        type: 'success',
        text: !currentPublished ? 'LPJ berhasil dipublikasikan ke publik!' : 'Publikasi LPJ dibatalkan.',
      });
      await fetchPrograms(masjidId);
    }
  };

  const isKetua = ['ketua_dkm', 'super_admin'].includes(userRole);

  const [activeProgId, setActiveProgId] = useState<string | null>(null);
  const [progressInput, setProgressInput] = useState(0);
  const [attendanceInput, setAttendanceInput] = useState(0);
  const [editingLPJId, setEditingLPJId] = useState<string | null>(null);
  const [lpjTextInput, setLpjTextInput] = useState('');

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-dark mb-1 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-primary" /> Kelola Program
          </h1>
          <p className="text-slate-light">Buat proposal, pantau pelaksanaan, dan terbitkan LPJ program masjid.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/pengurus/program/analisis"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 text-sm font-semibold rounded-2xl transition-all border border-emerald-200 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>Analisis Sentimen AI</span>
          </Link>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-2xl hover:bg-primary/90 transition-colors cursor-pointer"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Batal' : 'Buat Program'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
            : 'bg-rose-50 text-rose-800 border border-rose-100'
        }`}>
          {message.type === 'success'
            ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="mb-8 bg-white border border-gray-100 rounded-3xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-dark mb-5">Proposal Program Baru</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-light uppercase tracking-wider mb-1.5">Nama Program *</label>
              <input required type="text" placeholder="cth. Pembangunan Kanopi Wudhu"
                value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-light uppercase tracking-wider mb-1.5">Deskripsi</label>
              <textarea rows={3} placeholder="Tujuan dan detail program..."
                value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-light uppercase tracking-wider mb-1.5">Anggaran (Rp)</label>
              <input type="number" placeholder="50000000"
                value={form.budget} onChange={e => setForm(p => ({ ...p, budget: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-light uppercase tracking-wider mb-1.5">Mulai</label>
                <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-light uppercase tracking-wider mb-1.5">Selesai</label>
                <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white text-sm font-semibold rounded-2xl hover:bg-primary/90 disabled:opacity-50 cursor-pointer">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Kirim Proposal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Program List */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : programs.length === 0 ? (
        <div className="flex flex-col items-center py-20 bg-white rounded-3xl border border-gray-100 text-slate-light">
          <BookOpen className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium">Belum ada program</p>
        </div>
      ) : (
        <div className="space-y-6">
          {programs.map(prog => {
            const s = STATUS_FLOW[prog.status as ProgramStatus] ?? STATUS_FLOW.draft;
            const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
            const showProgressSection = ['approved', 'completed'].includes(prog.status);
            
            const programDonations = (prog as any).donations || [];
            const confirmedDonationsSum = programDonations
              .filter((d: any) => d.status === 'confirmed')
              .reduce((sum: number, d: any) => sum + Number(d.amount), 0);
            const donationProgressPct = prog.budget && Number(prog.budget) > 0
              ? Math.min(100, Math.round((confirmedDonationsSum / Number(prog.budget)) * 1000) / 10)
              : 0;

            return (
              <div key={prog.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${s.color}`}>
                        {prog.status === 'approved' ? <CheckCircle className="w-3 h-3" />
                          : prog.status === 'rejected' ? <XCircle className="w-3 h-3" />
                          : <Clock className="w-3 h-3" />}
                        {s.label}
                      </span>
                      {prog.lpj_published && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          LPJ Terpublikasi
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-lg text-slate-dark">{prog.title}</h3>
                    {prog.description && <p className="text-sm text-slate-light mt-1">{prog.description}</p>}
                    
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-light">
                      {prog.budget && (
                        <span className="font-semibold text-primary">
                          Anggaran: {fmt(Number(prog.budget))}
                          {confirmedDonationsSum > 0 && ` (Terkumpul: ${fmt(confirmedDonationsSum)} / ${donationProgressPct}%)`}
                        </span>
                      )}
                      {prog.start_date && <span>{prog.start_date} → {prog.end_date ?? '?'}</span>}
                      {showProgressSection && (
                        <span>Progress Fisik: {prog.execution_progress ?? 0}% · Partisipasi: {prog.attendance_count ?? 0} jamaah</span>
                      )}
                    </div>
                  </div>

                  {/* Program status & proposal flow */}
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {/* Approval Actions (Ketua DKM only) */}
                    {isKetua && prog.status === 'pending_approval' && (
                      <>
                        <button onClick={() => handleStatusChange(prog, 'approved')}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white text-xs font-semibold rounded-xl hover:bg-emerald-600 transition-colors cursor-pointer">
                          <CheckCircle className="w-3.5 h-3.5" /> Setujui
                        </button>
                        <button onClick={() => handleStatusChange(prog, 'rejected')}
                          className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 text-white text-xs font-semibold rounded-xl hover:bg-rose-600 transition-colors cursor-pointer">
                          <XCircle className="w-3.5 h-3.5" /> Tolak
                        </button>
                      </>
                    )}

                    {/* Kirim untuk approval (draft) */}
                    {prog.status === 'draft' && (
                      <button onClick={() => handleStatusChange(prog, 'pending_approval')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary text-xs font-semibold rounded-xl hover:bg-primary hover:text-white transition-colors cursor-pointer">
                        Ajukan Proposal
                      </button>
                    )}

                    {/* Button to toggle edit progress / LPJ panel */}
                    {showProgressSection && (
                      <button
                        onClick={() => {
                          if (activeProgId === prog.id) {
                            setActiveProgId(null);
                          } else {
                            setActiveProgId(prog.id);
                            setProgressInput(prog.execution_progress ?? 0);
                            setAttendanceInput(prog.attendance_count ?? 0);
                          }
                        }}
                        className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-slate hover:bg-slate-50 transition-all cursor-pointer"
                      >
                        {activeProgId === prog.id ? 'Tutup Panel' : 'Kelola Pelaksanaan & LPJ'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar visual */}
                {showProgressSection && (
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-2">
                    <div className="bg-primary h-full transition-all duration-300" style={{ width: `${prog.execution_progress ?? 0}%` }}></div>
                  </div>
                )}

                {/* Interactive Panel for Progress updates and LPJ */}
                {activeProgId === prog.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 bg-slate-50 rounded-2xl p-4 space-y-4">
                    {/* Update Progress & Attendance */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-dark uppercase tracking-wider mb-2">Update Kemajuan & Kehadiran</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-light uppercase mb-1">Kemajuan Program ({progressInput}%)</label>
                          <input
                            type="range" min="0" max="100" value={progressInput}
                            onChange={e => setProgressInput(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-light uppercase mb-1">Jumlah Peserta Hadir (Jamaah)</label>
                          <input
                            type="number" value={attendanceInput}
                            onChange={e => setAttendanceInput(Number(e.target.value))}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white"
                          />
                        </div>
                        <button
                          onClick={() => handleUpdateProgress(prog.id, progressInput, attendanceInput)}
                          className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary/90 transition-all cursor-pointer"
                        >
                          Simpan Progress
                        </button>
                      </div>
                    </div>

                    {/* Automated LPJ */}
                    <div className="pt-2 border-t border-gray-200/60">
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <h4 className="text-xs font-bold text-slate-dark uppercase tracking-wider">Laporan Pertanggungjawaban (LPJ)</h4>
                        {!prog.lpj_text && (
                          <button
                            onClick={() => handleGenerateLPJ(prog)}
                            className="px-3 py-1 bg-emerald-500 text-white text-[11px] font-semibold rounded-lg hover:bg-emerald-600 transition-all cursor-pointer"
                          >
                            Buat LPJ Otomatis dari Transaksi
                          </button>
                        )}
                      </div>

                      {prog.lpj_text ? (
                        <div className="space-y-3">
                          {editingLPJId === prog.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={lpjTextInput} onChange={e => setLpjTextInput(e.target.value)}
                                rows={8} className="w-full p-3 border border-gray-200 bg-white rounded-xl text-xs font-mono focus:outline-none"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    await handleUpdateLPJText(prog.id, lpjTextInput);
                                    setEditingLPJId(null);
                                  }}
                                  className="px-3 py-1 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/95"
                                >
                                  Simpan Naskah
                                </button>
                                <button
                                  onClick={() => setEditingLPJId(null)}
                                  className="px-3 py-1 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-white"
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <pre className="p-3 bg-white border border-gray-200 rounded-xl text-slate text-xs overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto">
                                {prog.lpj_text}
                              </pre>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => {
                                    setEditingLPJId(prog.id);
                                    setLpjTextInput(prog.lpj_text || '');
                                  }}
                                  className="px-3 py-1 bg-slate border border-gray-200 rounded-lg text-xs font-semibold text-slate-dark hover:bg-white hover:text-primary transition-all cursor-pointer"
                                >
                                  Edit Naskah LPJ
                                </button>
                                
                                {/* PROG-05: Publikasi LPJ & Tautan Publik */}
                                <button
                                  onClick={() => handleTogglePublishLPJ(prog.id, !!prog.lpj_published)}
                                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                    prog.lpj_published 
                                      ? 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100'
                                  }`}
                                >
                                  {prog.lpj_published ? 'Batalkan Publikasi LPJ' : 'Publikasikan LPJ ke Publik'}
                                </button>

                                {prog.lpj_published && (
                                  <a
                                    href={`/public/lpj/${prog.id}`} target="_blank" rel="noreferrer"
                                    className="inline-flex items-center justify-center px-3 py-1 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-all"
                                  >
                                    Buka Link Publik LPJ
                                  </a>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-light italic">Belum ada LPJ yang dibuat. Klik tombol di kanan atas untuk membuat laporan pertanggungjawaban berdasarkan catatan anggaran proposal dan realisasi pengeluaran keuangan masjid secara otomatis.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
