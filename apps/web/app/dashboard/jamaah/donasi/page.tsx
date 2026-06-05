'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '../../../../utils/supabase/client';
import { CreditCard, Loader2, Clock, CheckCircle, XCircle } from 'lucide-react';
import type { Donation } from '../../../../lib/db/types';

export default function RiwayatDonasiPage() {
  const supabase = createClient();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDonations = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('donations')
        .select('*, programs(title), masjids(name)')
        .eq('donor_id', user.id)
        .order('created_at', { ascending: false });
      setDonations(data ?? []);
      setLoading(false);
    };
    fetchDonations();
  }, [supabase]);

  const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const statusIcon = (status: string) => {
    if (status === 'confirmed') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (status === 'rejected')  return <XCircle className="w-4 h-4 text-rose-500" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  const statusLabel = (status: string) => ({
    confirmed: { label: 'Dikonfirmasi', cls: 'bg-emerald-100 text-emerald-700' },
    rejected:  { label: 'Ditolak',       cls: 'bg-rose-100 text-rose-700' },
    pending:   { label: 'Menunggu',      cls: 'bg-amber-100 text-amber-700' },
  }[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' });

  const totalConfirmed = donations
    .filter(d => d.status === 'confirmed')
    .reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-dark mb-1 flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-primary" />
          Riwayat Donasi
        </h1>
        <p className="text-slate-light">Histori donasi yang telah Anda berikan.</p>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div className="bg-primary rounded-3xl p-6 text-white shadow-md">
          <p className="text-sm font-medium opacity-80 mb-1">Total Donasi Dikonfirmasi</p>
          <p className="text-3xl font-extrabold">{fmt(totalConfirmed)}</p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm font-semibold text-slate-light mb-1">Jumlah Transaksi</p>
          <p className="text-3xl font-extrabold text-slate-dark">{donations.length} <span className="text-base font-normal text-slate-light">donasi</span></p>
        </div>
      </div>

      {/* Donation List */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : donations.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-slate-light">
            <CreditCard className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">Belum ada riwayat donasi</p>
            <p className="text-sm mt-1">Mulai berdonasi untuk program masjid favoritmu</p>
          </div>
        ) : (
          donations.map((don, i) => {
            const sl = statusLabel(don.status);
            return (
              <div key={don.id} className={`flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors ${i < donations.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  {statusIcon(don.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-dark truncate">
                    {(don as any).programs?.title ?? 'Donasi Umum'}
                  </p>
                  <p className="text-xs text-slate-light mt-0.5">
                    {(don as any).masjids?.name ?? '—'} · {fmtDate(don.created_at)}
                  </p>
                  {don.unique_code && (
                    <p className="text-xs text-primary font-mono mt-0.5">Kode: {don.unique_code}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-slate-dark">{fmt(Number(don.amount))}</p>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${sl.cls}`}>
                    {sl.label}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
