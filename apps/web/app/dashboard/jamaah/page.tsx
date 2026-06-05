'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '../../../utils/supabase/client';
import { 
  Search, ShieldCheck, Heart, BookOpen, Building2, 
  MapPin, CheckCircle, ArrowRight, Loader2, RefreshCw, Sparkles
} from 'lucide-react';

interface MasjidRow {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
}

export default function JamaahDashboard() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('Jama\'ah');
  const [isVerified, setIsVerified] = useState(false);
  const [totalDonation, setTotalDonation] = useState(0);
  const [registeredProgramsCount, setRegisteredProgramsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Active Masjid
  const [myMasjid, setMyMasjid] = useState<MasjidRow | null>(null);
  
  // Search state
  const [masjids, setMasjids] = useState<MasjidRow[]>([]);
  const [search, setSearch] = useState('');
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // AI recommendations
  const [recommendedPrograms, setRecommendedPrograms] = useState<any[]>([]);

  const fetchDashboardData = useCallback(async (uid: string) => {
    const [userRes, donRes, regRes, masjidsRes, myMasjidRes] = await Promise.all([
      supabase.from('users').select('full_name, is_verified_donor').eq('id', uid).maybeSingle(),
      supabase.from('donations').select('amount').eq('donor_id', uid).eq('status', 'confirmed'),
      supabase.from('program_registrations').select('program_id').eq('user_id', uid),
      supabase.from('masjids').select('*').order('name'),
      supabase.from('user_masjid_roles')
        .select('masjid_id, masjids(id, name, address, city, province)')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    if (userRes.data) {
      setUserName(userRes.data.full_name || 'Jama\'ah');
      setIsVerified(!!userRes.data.is_verified_donor);
    }

    const total = (donRes.data ?? []).reduce((acc, curr) => acc + Number(curr.amount), 0);
    setTotalDonation(total);

    setRegisteredProgramsCount((regRes.data ?? []).length);
    setMasjids(masjidsRes.data ?? []);

    const myM = myMasjidRes.data?.masjids as any;
    const activeMasjid = Array.isArray(myM) ? myM[0] : myM;
    if (activeMasjid) {
      setMyMasjid(activeMasjid);
      
      // Fetch active programs for this masjid for recommendations
      const { data: progData } = await supabase
        .from('programs')
        .select('*')
        .eq('masjid_id', activeMasjid.id)
        .eq('status', 'approved');

      const userRegIds = (regRes.data ?? []).map((r: any) => r.program_id);
      const unregProgs = (progData ?? []).filter((p: any) => !userRegIds.includes(p.id));
      
      if (unregProgs.length > 0) {
        setRecommendedPrograms(unregProgs.slice(0, 3));
      } else {
        // Fallback demo program if no approved programs are left
        setRecommendedPrograms([{
          id: 'demo-rec-1',
          category: 'Pendidikan (Simulasi AI)',
          title: 'Kajian Parenting Islami & Tumbuh Kembang Anak',
          description: 'Belajar metode mendidik anak secara islami berbasis sirah nabawiyah untuk membangun generasi tangguh.',
          start_date: 'Segera Hadir'
        }]);
      }
    } else {
      setMyMasjid(null);
      setRecommendedPrograms([]);
    }
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      await fetchDashboardData(user.id);
      setLoading(false);
    };
    init();
  }, [supabase, fetchDashboardData]);

  const handleJoinMasjid = async (masjidId: string) => {
    if (!userId) return;
    setJoiningId(masjidId);
    
    // Hapus role jamaah lama di masjid lain agar data bersih (hanya 1 masjid terdaftar)
    await supabase
      .from('user_masjid_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', 'jamaah');

    // Upsert role baru
    const { error } = await supabase
      .from('user_masjid_roles')
      .upsert({ user_id: userId, masjid_id: masjidId, role: 'jamaah' }, { onConflict: 'user_id,masjid_id' });

    if (!error) {
      await fetchDashboardData(userId);
    }
    setJoiningId(null);
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

  const filteredMasjids = masjids.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.city ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (m.province ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-dark mb-1">
            Assalamu'alaikum, {userName}!
          </h1>
          <p className="text-slate-light">Berikut ringkasan kebaikan dan kontribusi Anda.</p>
        </div>
        {myMasjid && (
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-2xl px-4 py-2 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold">{myMasjid.name}</p>
              <p className="opacity-80">{myMasjid.city || 'Kota tidak diatur'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Cards Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between min-h-36">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs font-semibold text-slate-light uppercase tracking-wider">Status Verifikasi</p>
            <ShieldCheck className={`w-5 h-5 ${isVerified ? 'text-emerald-500' : 'text-slate-light'}`} />
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isVerified ? 'bg-emerald-500' : 'bg-amber-400'}`}></div>
            <p className="text-lg font-bold text-slate-dark">
              {isVerified ? 'Donatur Verified' : 'Jama\'ah Biasa'}
            </p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between min-h-36">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs font-semibold text-slate-light uppercase tracking-wider">Total Donasi Anda</p>
            <Heart className="w-5 h-5 text-rose-500" />
          </div>
          <p className="text-2xl font-extrabold text-primary">{fmt(totalDonation)}</p>
        </div>

        <div className="bg-primary p-6 rounded-3xl shadow-md text-white flex flex-col justify-between min-h-36 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <BookOpen className="w-20 h-20" />
          </div>
          <div className="flex justify-between items-center mb-3 relative z-10">
            <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Program Diikuti</p>
            <CheckCircle className="w-5 h-5 text-white/80" />
          </div>
          <p className="text-2xl font-extrabold relative z-10">
            {registeredProgramsCount} <span className="text-sm font-normal opacity-85">Program Aktif</span>
          </p>
        </div>
      </div>

      {/* AI Recommendations */}
      {myMasjid && recommendedPrograms.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-50/50 to-primary/5 rounded-3xl border border-emerald-100 p-6 mb-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-extrabold text-slate-dark flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                Rekomendasi Program untuk Anda (AI)
              </h2>
              <p className="text-xs text-slate-light">Program bermanfaat dari {myMasjid.name} yang belum Anda ikuti.</p>
            </div>
            <Link href="/dashboard/jamaah/program" className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
              Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendedPrograms.map(prog => (
              <div key={prog.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-md font-bold uppercase tracking-wider">
                    {prog.category}
                  </span>
                  <h3 className="font-bold text-slate-dark text-sm mt-2 line-clamp-1">{prog.title}</h3>
                  <p className="text-[11px] text-slate-light mt-1 line-clamp-2 leading-relaxed">{prog.description}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-[10px] text-slate-light">Mulai: {prog.start_date || '—'}</span>
                  <Link 
                    href="/dashboard/jamaah/program" 
                    className="text-[10px] bg-primary hover:bg-primary-dark text-white font-bold px-3 py-1 rounded-lg transition-all"
                  >
                    Daftar / Donasi
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PORT-01: Pencarian & Pendaftaran Masjid */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-10">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-dark mb-1 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Temukan & Ikuti Masjid Favoritmu
          </h2>
          <p className="text-sm text-slate-light">Cari masjid berdasarkan nama atau lokasi untuk melihat program aktif dan laporan transparansi keuangannya.</p>
        </div>

        {/* Search Input */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-light" />
          <input
            type="text"
            placeholder="Cari nama masjid, kota, atau provinsi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary text-slate-dark"
          />
        </div>

        {/* Masjid Grid Result */}
        {filteredMasjids.length === 0 ? (
          <div className="text-center py-10 text-slate-light">
            <p className="font-semibold text-sm">Tidak ada masjid ditemukan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredMasjids.map(m => {
              const isJoined = myMasjid?.id === m.id;
              const isJoining = joiningId === m.id;

              return (
                <div 
                  key={m.id} 
                  className={`border rounded-2xl p-4 flex justify-between items-center transition-all ${
                    isJoined ? 'border-emerald-200 bg-emerald-50/20' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="min-w-0 pr-3">
                    <p className="font-bold text-slate-dark text-sm truncate">{m.name}</p>
                    <p className="text-xs text-slate-light flex items-center gap-1 mt-1 truncate">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      {m.address || ''} {m.city ? `· ${m.city}` : ''}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => handleJoinMasjid(m.id)}
                    disabled={isJoined || isJoining}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isJoined 
                        ? 'bg-emerald-100 text-emerald-800 cursor-default' 
                        : 'bg-primary text-white hover:bg-primary/95 disabled:opacity-50'
                    }`}
                  >
                    {isJoining ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : isJoined ? (
                      'Diikuti'
                    ) : (
                      'Ikuti Masjid'
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
