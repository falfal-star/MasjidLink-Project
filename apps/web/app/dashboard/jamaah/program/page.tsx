'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '../../../../utils/supabase/client';
import { 
  BookOpen, Loader2, Clock, CheckCircle, XCircle, 
  ArrowUpRight, Heart, HeartHandshake, Check, AlertCircle, Copy
} from 'lucide-react';
import type { Program, ProgramRegistration } from '../../../../lib/db/types';

export default function JamaahProgramPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [masjidId, setMasjidId] = useState<string | null>(null);
  const [programs, setPrograms] = useState<(Program & { masjids?: { name: string } })[]>([]);
  const [registrations, setRegistrations] = useState<string[]>([]); // Program IDs registered
  const [loading, setLoading] = useState(true);

  // Donation Modal states
  const [activeDonationProg, setActiveDonationProg] = useState<Program | null>(null);
  const [donationAmount, setDonationAmount] = useState('');
  const [submittingDonation, setSubmittingDonation] = useState(false);
  const [invoice, setInvoice] = useState<{ amount: number; uniqueCode: string; programTitle: string } | null>(null);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchProgramsData = useCallback(async (uid: string, mid: string) => {
    const [progRes, regRes] = await Promise.all([
      supabase.from('programs').select('*, masjids(name)').eq('masjid_id', mid).in('status', ['approved', 'completed']).order('created_at', { ascending: false }),
      supabase.from('program_registrations').select('program_id').eq('user_id', uid)
    ]);

    setPrograms(progRes.data ?? []);
    setRegistrations((regRes.data ?? []).map(r => r.program_id));
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Cari masjid si user
      const { data: roleData } = await supabase
        .from('user_masjid_roles')
        .select('masjid_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleData?.masjid_id) {
        setMasjidId(roleData.masjid_id);
        await fetchProgramsData(user.id, roleData.masjid_id);
      }
      setLoading(false);
    };
    init();
  }, [supabase, fetchProgramsData]);

  // PORT-03: Pendaftaran Program Kegiatan
  const handleRegisterProgram = async (progId: string) => {
    if (!userId || !masjidId) return;
    const { error } = await supabase
      .from('program_registrations')
      .insert({ user_id: userId, program_id: progId });

    if (error) {
      setMessage({ type: 'error', text: `Gagal daftar kegiatan: ${error.message}` });
    } else {
      const programTitle = programs.find(p => p.id === progId)?.title || 'Program Masjid';
      
      // Log notifications
      await supabase.from('notification_logs').insert([
        {
          user_id: userId,
          type: 'whatsapp',
          title: 'Pendaftaran Program',
          content: `Assalamualaikum. Pendaftaran Anda untuk program '${programTitle}' telah berhasil. Terima kasih atas partisipasi Anda. Wassalamu'alaikum.`,
          status: 'sent'
        },
        {
          user_id: userId,
          type: 'push',
          title: 'Pendaftaran Berhasil',
          content: `Anda telah terdaftar di program: ${programTitle}. Jangan lewatkan jadwal kegiatannya!`,
          status: 'sent'
        }
      ]);

      setMessage({ type: 'success', text: 'Berhasil mendaftar untuk kegiatan masjid.' });
      await fetchProgramsData(userId, masjidId);
    }
  };

  // PORT-04: Donasi Manual dengan Kode Unik
  const handleCreateDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !masjidId || !activeDonationProg || !donationAmount) return;
    setSubmittingDonation(true);
    setMessage(null);

    const baseAmount = Number(donationAmount);
    if (baseAmount <= 0) return;

    // Generate random 3-digit unique code suffix
    const randomSuffix = Math.floor(100 + Math.random() * 900); // 100-999
    const totalAmount = baseAmount + randomSuffix;

    const { error } = await supabase
      .from('donations')
      .insert({
        masjid_id: masjidId,
        program_id: activeDonationProg.id,
        donor_id: userId,
        amount: totalAmount,
        unique_code: String(randomSuffix),
        status: 'pending'
      });

    if (error) {
      setMessage({ type: 'error', text: `Gagal membuat donasi: ${error.message}` });
    } else {
      setInvoice({
        amount: totalAmount,
        uniqueCode: String(randomSuffix),
        programTitle: activeDonationProg.title
      });
      setDonationAmount('');
      setActiveDonationProg(null);
    }
    setSubmittingDonation(false);
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
      approved:  { label: 'Berlangsung', cls: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3 h-3" /> },
      completed: { label: 'Selesai',     cls: 'bg-blue-100 text-blue-700',       icon: <CheckCircle className="w-3 h-3" /> },
    };
    const s = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600', icon: <Clock className="w-3 h-3" /> };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${s.cls}`}>
        {s.icon}{s.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-dark mb-1 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          Program Masjid
        </h1>
        <p className="text-slate-light">Ikuti kegiatan dan berikan kontribusi donasi terbaik Anda.</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
            : 'bg-rose-50 text-rose-800 border border-rose-100'
        }`}>
          {message.type === 'success'
            ? <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Invoice Modal (PORT-04 Invoice) */}
      {invoice && (
        <div className="mb-8 bg-white border border-primary/20 rounded-3xl shadow-md p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-primary"></div>
          <h2 className="text-lg font-bold text-slate-dark mb-2 flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-primary animate-bounce" /> Menunggu Pembayaran Transfer
          </h2>
          <p className="text-xs text-slate-light mb-4">Silakan transfer persis hingga digit terakhir agar sistem kami dapat memverifikasi donasi secara otomatis.</p>
          
          <div className="bg-slate-50 rounded-2xl p-4 mb-4">
            <p className="text-[10px] text-slate-light uppercase font-semibold">Program</p>
            <p className="text-sm font-bold text-slate-dark">{invoice.programTitle}</p>

            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <p className="text-[10px] text-slate-light uppercase font-semibold">Total Transfer</p>
                <p className="text-2xl font-black text-primary font-mono">{fmt(invoice.amount)}</p>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  Kode Unik: {invoice.uniqueCode}
                </span>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-light space-y-1 mb-4 leading-relaxed">
            <p>· Salurkan ke Rekening: **Bank Syariah Indonesia (BSI) 7111-222-333**</p>
            <p>· Atas Nama: **DKM Masjid Al-Muhajirin**</p>
            <p>· Setelah transfer, transaksi akan diverifikasi oleh bendahara masjid dalam 1x24 jam.</p>
          </div>

          <button
            onClick={() => setInvoice(null)}
            className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/95 transition-all"
          >
            Saya Mengerti
          </button>
        </div>
      )}

      {/* Program Donation Modal popup input */}
      {activeDonationProg && (
        <div className="mb-8 bg-white border border-gray-100 rounded-3xl shadow-sm p-6">
          <h2 className="text-base font-bold text-slate-dark mb-4">Donasi untuk: {activeDonationProg.title}</h2>
          <form onSubmit={handleCreateDonation} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-light uppercase tracking-wider mb-1.5">Jumlah Donasi Pokok (Rp)</label>
              <input
                required type="number" placeholder="cth. 100000" min="1000"
                value={donationAmount}
                onChange={e => setDonationAmount(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              <button
                type="submit" disabled={submittingDonation}
                className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-2xl hover:bg-primary/95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {submittingDonation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />} Donasikan
              </button>
              <button
                type="button" onClick={() => setActiveDonationProg(null)}
                className="px-4 py-2.5 border border-gray-200 rounded-2xl text-sm font-semibold text-slate hover:bg-slate-50"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Program List */}
      {!masjidId ? (
        <div className="flex flex-col items-center py-20 bg-white rounded-3xl border border-gray-100 text-slate-light">
          <BookOpen className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-semibold text-sm">Pilih masjid di Beranda terlebih dahulu untuk melihat program masjid.</p>
        </div>
      ) : programs.length === 0 ? (
        <div className="flex flex-col items-center py-20 bg-white rounded-3xl border border-gray-100 text-slate-light">
          <BookOpen className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-semibold text-sm">Belum ada program aktif di masjid ini</p>
        </div>
      ) : (
        <div className="space-y-4">
          {programs.map(prog => {
            const isRegistered = registrations.includes(prog.id);
            const isCompleted = prog.status === 'completed';

            return (
              <div key={prog.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-2">{statusBadge(prog.status)}</div>
                    <h3 className="font-bold text-lg text-slate-dark">{prog.title}</h3>
                    {prog.description && (
                      <p className="text-sm text-slate-light mt-1 line-clamp-2">{prog.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-light">
                      {prog.budget && (
                        <span className="font-semibold text-primary">Target Anggaran: {fmt(Number(prog.budget))}</span>
                      )}
                      {prog.start_date && (
                        <span>{prog.start_date} → {prog.end_date ?? '?'}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions (Pendaftaran & Donasi) */}
                  <div className="flex gap-2 shrink-0 self-end sm:self-auto">
                    {/* PORT-03: Register button */}
                    {!isCompleted && (
                      <button
                        onClick={() => handleRegisterProgram(prog.id)}
                        disabled={isRegistered}
                        className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                          isRegistered 
                            ? 'bg-emerald-50 text-emerald-800 cursor-default flex items-center gap-1' 
                            : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'
                        }`}
                      >
                        {isRegistered ? (
                          <><Check className="w-3.5 h-3.5" /> Terdaftar</>
                        ) : (
                          'Daftar Kegiatan'
                        )}
                      </button>
                    )}

                    {/* PORT-04: Donate button */}
                    {!isCompleted && (
                      <button
                        onClick={() => { setActiveDonationProg(prog); setInvoice(null); }}
                        className="px-4 py-2 bg-rose-50 text-rose-600 text-xs font-semibold rounded-xl hover:bg-rose-500 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Heart className="w-3.5 h-3.5" /> Donasi
                      </button>
                    )}
                    
                    {/* LPJ Share (if completed) */}
                    {isCompleted && prog.lpj_published && (
                      <a
                        href={`/public/lpj/${prog.id}`} target="_blank" rel="noreferrer"
                        className="px-4 py-2 bg-slate border border-gray-200 text-slate-dark text-xs font-semibold rounded-xl hover:bg-white transition-all inline-flex items-center gap-1"
                      >
                        Lihat LPJ Publik <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
