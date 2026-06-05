'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '../../../../utils/supabase/client';
import { 
  Building2, TrendingUp, TrendingDown, Wallet, 
  Loader2, AlertCircle, FileText, ChevronRight, Award
} from 'lucide-react';
import type { Transaction } from '../../../../lib/db/types';

interface PublicMasjidInfo {
  name: string;
  address: string | null;
  city: string | null;
}

export default function PublicKeuanganPage() {
  const params = useParams();
  const masjidId = params.masjid_id as string;
  const supabase = createClient();

  const [masjid, setMasjid] = useState<PublicMasjidInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!masjidId) return;
    const fetchData = async () => {
      try {
        const [masjidRes, txRes] = await Promise.all([
          supabase.from('masjids').select('name, address, city').eq('id', masjidId).maybeSingle(),
          supabase.from('transactions').select('*').eq('masjid_id', masjidId).order('created_at', { ascending: false }),
        ]);

        if (masjidRes.error) throw masjidRes.error;
        if (txRes.error) throw txRes.error;

        if (!masjidRes.data) {
          setError('Masjid tidak ditemukan atau belum terdaftar.');
        } else {
          setMasjid(masjidRes.data);
          setTransactions(txRes.data ?? []);
        }
      } catch (e: any) {
        setError(e.message || 'Terjadi kesalahan saat memuat data keuangan publik.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [masjidId, supabase]);

  const totals = transactions.reduce((acc, curr) => {
    const amt = Number(curr.amount);
    if (curr.type === 'pengeluaran') {
      acc.pengeluaran += amt;
    } else {
      acc.pemasukan += amt;
      acc[curr.type] = (acc[curr.type] || 0) + amt;
    }
    return acc;
  }, { pemasukan: 0, pengeluaran: 0, zakat: 0, infaq: 0, shodaqoh: 0, wakaf: 0, hibah: 0 });

  const saldo = totals.pemasukan - totals.pengeluaran;

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin text-primary" />
          <p className="text-slate text-sm font-medium">Memuat Laporan Transparansi Keuangan...</p>
        </div>
      </div>
    );
  }

  if (error || !masjid) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-slate-dark mb-2">Akses Ditolak</h1>
          <p className="text-sm text-slate-light leading-relaxed mb-6">{error || 'Data tidak tersedia.'}</p>
          <a href="/" className="inline-flex justify-center px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-2xl hover:bg-primary/95 transition-all">
            Kembali ke Beranda
          </a>
        </div>
      </div>
    );
  }

  const items = [
    { label: 'Infaq', amount: totals.infaq, color: 'bg-blue-500', pct: totals.pemasukan ? (totals.infaq / totals.pemasukan) * 100 : 0 },
    { label: 'Zakat', amount: totals.zakat, color: 'bg-emerald-500', pct: totals.pemasukan ? (totals.zakat / totals.pemasukan) * 100 : 0 },
    { label: 'Shodaqoh', amount: totals.shodaqoh, color: 'bg-indigo-500', pct: totals.pemasukan ? (totals.shodaqoh / totals.pemasukan) * 100 : 0 },
    { label: 'Wakaf', amount: totals.wakaf, color: 'bg-purple-500', pct: totals.pemasukan ? (totals.wakaf / totals.pemasukan) * 100 : 0 },
    { label: 'Hibah', amount: totals.hibah, color: 'bg-teal-500', pct: totals.pemasukan ? (totals.hibah / totals.pemasukan) * 100 : 0 },
  ].sort((a, b) => b.amount - a.amount);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Branding */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
            <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <h1 className="text-xl font-black text-slate-dark">{masjid.name}</h1>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                  <Award className="w-3 h-3" /> Transparan
                </span>
              </div>
              <p className="text-xs text-slate-light">{masjid.address || 'Alamat tidak diisi'}, {masjid.city || ''}</p>
            </div>
          </div>
          <div className="text-center sm:text-right shrink-0">
            <span className="text-[10px] font-bold text-slate-light uppercase tracking-widest block">Portal Publik Resmi</span>
            <span className="text-xs font-bold text-primary mt-1 block">Laporan Keuangan PSAK 409</span>
          </div>
        </div>

        {/* Dashboard Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-light uppercase tracking-wider">Total Pemasukan</p>
              <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-emerald-600">{fmt(totals.pemasukan)}</p>
              <p className="text-[10px] text-slate-light mt-1">Zakat + Infaq + Shodaqoh + Wakaf + Hibah</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-light uppercase tracking-wider">Total Pengeluaran</p>
              <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-rose-600" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-rose-600">{fmt(totals.pengeluaran)}</p>
              <p className="text-[10px] text-slate-light mt-1">Penyaluran program kemaslahatan</p>
            </div>
          </div>

          <div className="bg-primary rounded-3xl shadow-md p-6 text-white flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">Saldo Bersih Terkini</p>
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-extrabold">{fmt(saldo)}</p>
              <p className="text-[10px] opacity-70 mt-1">Sisa saldo dana kas masjid</p>
            </div>
          </div>
        </div>

        {/* Visualizations & Pos ZISWAF Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pos ZISWAF breakdown with progress bars */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-dark mb-5">Rincian Pos Sumber Dana ZISWAF</h2>
            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-dark">{item.label}</span>
                    <span className="text-slate-light">{fmt(item.amount)} ({item.pct.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className={`${item.color} h-full rounded-full`} style={{ width: `${item.pct}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic chart visualizer - premium style */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-dark mb-1">Rasio Alokasi Penyaluran</h2>
              <p className="text-[11px] text-slate-light">Persentase pengeluaran dibanding total kas masuk.</p>
            </div>
            
            <div className="my-6 flex items-center justify-center">
              {/* Custom interactive CSS progress circle / radial visualizer */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[10px] border-slate-100"></div>
                <div className="absolute inset-0 rounded-full border-[10px] border-primary border-t-transparent border-r-transparent animate-pulse" style={{ transform: `rotate(${Math.min(360, (totals.pengeluaran / (totals.pemasukan || 1)) * 360)}deg)` }}></div>
                <div className="text-center z-10">
                  <p className="text-2xl font-black text-slate-dark">
                    {totals.pemasukan ? ((totals.pengeluaran / totals.pemasukan) * 100).toFixed(0) : 0}%
                  </p>
                  <p className="text-[9px] font-bold text-slate-light uppercase tracking-wider mt-0.5">Dana Disalurkan</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 flex justify-between text-xs text-slate-light leading-relaxed">
              <span>Dana ZISWAF yang tersisa aman dalam pengelolaan syariah dan dikonsolidasikan untuk program mendatang.</span>
            </div>
          </div>
        </div>

        {/* Public Mutasi Transaksi Log */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="font-bold text-slate-dark text-base">Riwayat Mutasi & Catatan Kas Terbuka</h3>
          </div>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-light">
              <FileText className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">Belum ada transaksi terpublikasi</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-gray-100 text-left text-xs uppercase text-slate-light tracking-wider font-semibold sticky top-0">
                  <tr>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Tipe</th>
                    <th className="px-6 py-4">Keterangan</th>
                    <th className="px-6 py-4 text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => {
                    const isExpense = t.type === 'pengeluaran';
                    return (
                      <tr key={t.id} className="border-b border-gray-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-slate-light text-xs">
                          {new Date(t.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isExpense ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {isExpense ? 'Keluar' : t.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-dark font-medium text-xs">
                          {t.description || 'Sedang memproses alokasi'}
                        </td>
                        <td className={`px-6 py-4 text-right font-bold text-xs ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {isExpense ? '- ' : '+ '}{fmt(Number(t.amount))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
