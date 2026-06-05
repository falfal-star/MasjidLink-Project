'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '../../../utils/supabase/client';
import { 
  LayoutDashboard, TrendingUp, TrendingDown, Wallet,
  ArrowUpRight, Clock, CheckCircle, XCircle, Loader2
} from 'lucide-react';
import type { Program, Transaction } from '../../../lib/db/types';

interface MasjidFinanceSummary {
  totalPemasukan: number;
  totalPengeluaran: number;
  saldo: number;
  byType: Record<string, number>;
}

export default function PengurusDashboard() {
  const supabase = createClient();
  const [masjidId, setMasjidId] = useState<string | null>(null);
  const [masjidName, setMasjidName] = useState('');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [summary, setSummary] = useState<MasjidFinanceSummary>({
    totalPemasukan: 0, totalPengeluaran: 0, saldo: 0, byType: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Cari masjid_id user
      const { data: roleData } = await supabase
        .from('user_masjid_roles')
        .select('masjid_id, masjids(name)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!roleData?.masjid_id) { setLoading(false); return; }
      const mid = roleData.masjid_id;
      setMasjidId(mid);
      setMasjidName((roleData.masjids as any)?.name ?? '');

      // Fetch programs & transactions paralel
      const [progRes, txRes] = await Promise.all([
        supabase.from('programs').select('*').eq('masjid_id', mid).order('created_at', { ascending: false }).limit(5),
        supabase.from('transactions').select('type, amount').eq('masjid_id', mid),
      ]);

      setPrograms(progRes.data ?? []);

      // Hitung ringkasan keuangan
      const txs = (txRes.data ?? []) as any[];
      const byType: Record<string, number> = {};
      let pemasukan = 0, pengeluaran = 0;
      txs.forEach(t => {
        byType[t.type] = (byType[t.type] ?? 0) + Number(t.amount);
        if (t.type === 'pengeluaran') pengeluaran += Number(t.amount);
        else pemasukan += Number(t.amount);
      });
      setSummary({ totalPemasukan: pemasukan, totalPengeluaran: pengeluaran, saldo: pemasukan - pengeluaran, byType });
      setLoading(false);
    };
    fetchAll();
  }, [supabase]);

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
      draft:            { label: 'Draft',         cls: 'bg-gray-100 text-gray-600',   icon: <Clock className="w-3 h-3" /> },
      pending_approval: { label: 'Menunggu',      cls: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3 h-3" /> },
      approved:         { label: 'Disetujui',     cls: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3 h-3" /> },
      rejected:         { label: 'Ditolak',       cls: 'bg-rose-100 text-rose-700',   icon: <XCircle className="w-3 h-3" /> },
      completed:        { label: 'Selesai',       cls: 'bg-blue-100 text-blue-700',   icon: <CheckCircle className="w-3 h-3" /> },
    };
    const s = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600', icon: null };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${s.cls}`}>
        {s.icon}{s.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-dark mb-1 flex items-center gap-3">
          <LayoutDashboard className="w-8 h-8 text-primary" />
          Ringkasan Keuangan
        </h1>
        <p className="text-slate-light">{masjidName || 'Masjid Anda'}</p>
      </div>

      {/* Finance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-light">Total Pemasukan</p>
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600">{fmt(summary.totalPemasukan)}</p>
          <p className="text-xs text-slate-light mt-1">Zakat + Infaq + Shodaqoh + Wakaf + Hibah</p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-light">Total Pengeluaran</p>
            <div className="w-9 h-9 bg-rose-100 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-rose-600">{fmt(summary.totalPengeluaran)}</p>
          <p className="text-xs text-slate-light mt-1">Total seluruh pengeluaran</p>
        </div>

        <div className="bg-primary rounded-3xl shadow-md p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold opacity-80">Saldo Bersih</p>
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold">{fmt(summary.saldo)}</p>
          <p className="text-xs opacity-70 mt-1">Pemasukan – Pengeluaran</p>
        </div>
      </div>

      {/* ZISWAF Breakdown */}
      {Object.keys(summary.byType).length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-10">
          <h2 className="text-base font-bold text-slate-dark mb-5">Rincian per Jenis Dana</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(summary.byType).map(([type, amount]) => (
              <div key={type} className="bg-slate-50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-slate-light uppercase tracking-wider capitalize">{type}</p>
                <p className="text-xl font-extrabold text-slate-dark mt-1">{fmt(amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Programs */}
      <h2 className="text-xl font-bold text-slate-dark mb-5">Program Terbaru</h2>
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {programs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-light">
            <p className="font-medium">Belum ada program</p>
            <p className="text-sm mt-1">Buat program pertama di menu Kelola Program</p>
          </div>
        ) : (
          programs.map((prog, i) => (
            <div key={prog.id} className={`flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors ${i < programs.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-dark truncate">{prog.title}</p>
                <p className="text-xs text-slate-light mt-0.5">
                  {prog.budget ? fmt(Number(prog.budget)) : 'Tanpa anggaran'} · {prog.start_date ?? '—'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {statusBadge(prog.status)}
                <ArrowUpRight className="w-4 h-4 text-slate-light" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
