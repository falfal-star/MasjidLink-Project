'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '../../../../utils/supabase/client';
import { BookOpen, AlertTriangle, Loader2, Calendar, FileText, Award } from 'lucide-react';

interface PublicLPJ {
  id: string;
  title: string;
  description: string | null;
  budget: number | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  lpj_text: string | null;
  lpj_published: boolean;
  masjids: {
    name: string;
    address: string | null;
    city: string | null;
  } | null;
}

export default function PublicLPJPage() {
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();
  
  const [data, setData] = useState<PublicLPJ | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchLPJ = async () => {
      try {
        const { data: lpjData, error: err } = await supabase
          .from('programs')
          .select('id, title, description, budget, status, start_date, end_date, lpj_text, lpj_published, masjids(name, address, city)')
          .eq('id', id)
          .eq('lpj_published', true)
          .maybeSingle();

        if (err) throw err;
        if (!lpjData) {
          setError('Laporan Pertanggungjawaban (LPJ) tidak ditemukan atau belum dipublikasikan.');
        } else {
          // Relasi masjids bisa berupa array atau object
          const masjidsRaw = lpjData.masjids;
          const masjid = Array.isArray(masjidsRaw) ? masjidsRaw[0] : masjidsRaw;
          
          setData({
            ...lpjData,
            masjids: masjid || null,
          } as any);
        }
      } catch (e: any) {
        setError(e.message || 'Terjadi kesalahan saat memuat data LPJ.');
      } finally {
        setLoading(false);
      }
    };
    fetchLPJ();
  }, [id, supabase]);

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin text-primary" />
          <p className="text-slate text-sm font-medium">Memuat Laporan LPJ...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-slate-dark mb-2">Akses Ditolak</h1>
          <p className="text-sm text-slate-light leading-relaxed mb-6">{error || 'Laporan tidak tersedia.'}</p>
          <a href="/" className="inline-flex justify-center px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-2xl hover:bg-primary/95 transition-all">
            Kembali ke Beranda
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-primary text-white px-8 py-8 relative">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-white/90" />
            <span className="text-xs font-bold uppercase tracking-wider text-white/90">Laporan Resmi Terverifikasi</span>
          </div>
          <h1 className="text-2xl font-extrabold leading-tight mb-2">{data.title}</h1>
          <p className="text-sm font-medium text-white/80">
            {data.masjids?.name || 'Masjid'} · {data.masjids?.city || 'Kab/Kota'}
          </p>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-8 border-b border-gray-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-light uppercase tracking-wider">Periode Pelaksanaan</p>
              <p className="text-sm font-bold text-slate-dark mt-0.5">
                {data.start_date ? `${data.start_date} s.d ${data.end_date ?? 'Selesai'}` : 'Tidak ditentukan'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-light uppercase tracking-wider">Anggaran Proposal</p>
              <p className="text-sm font-bold text-emerald-600 mt-0.5">
                {data.budget ? fmt(Number(data.budget)) : 'Tanpa Anggaran'}
              </p>
            </div>
          </div>
        </div>

        {/* Naskah LPJ */}
        <div className="p-8">
          <h2 className="text-base font-bold text-slate-dark mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> Dokumen Naskah LPJ
          </h2>
          <div className="bg-slate-50 border border-gray-200 rounded-2xl p-6 font-mono text-slate text-xs leading-relaxed whitespace-pre-wrap overflow-x-auto shadow-inner">
            {data.lpj_text || 'Dokumen LPJ kosong atau belum terisi.'}
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <p className="text-xs font-bold text-slate-dark">MasjidLink Transparency Portal</p>
              <p className="text-[10px] text-slate-light mt-0.5">Laporan Keuangan & Program Digital Berbasis Transparansi Syariah.</p>
            </div>
            <div className="w-16 h-16 bg-white border border-gray-200 rounded-xl p-1 flex items-center justify-center shrink-0 shadow-sm" title="Scan QR Code untuk verifikasi">
              {/* QR Code Placeholder (looks premium) */}
              <div className="w-full h-full bg-slate-100 rounded-lg flex flex-wrap items-center justify-center gap-[2px] p-1.5 opacity-60">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className={`w-2.5 h-2.5 rounded-[1px] ${i % 3 === 0 || i % 7 === 0 ? 'bg-slate-800' : 'bg-transparent'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
