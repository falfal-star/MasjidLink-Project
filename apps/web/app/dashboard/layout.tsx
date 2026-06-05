'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';
import { 
  LogOut, Home, CreditCard, LayoutDashboard, 
  Settings, Users, ShieldCheck, BookOpen, ChevronRight,
  MessageSquare, TrendingUp, Bell
} from 'lucide-react';
import type { UserRole } from '../../lib/db/types';

interface UserData {
  name: string;
  email: string;
  avatarUrl: string | null;
  role: UserRole;
  masjidId: string | null;
  masjidName: string | null;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Ambil role dari tabel user_masjid_roles
      const { data: roleData } = await supabase
        .from('user_masjid_roles')
        .select('role, masjid_id, masjids(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const role: UserRole = (roleData?.role as UserRole) ?? 'jamaah';
      const masjidsRaw = roleData?.masjids;
      const masjid = (Array.isArray(masjidsRaw) ? masjidsRaw[0] : masjidsRaw) as { name: string } | null;

      setUserData({
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Jama\'ah',
        email: user.email || '',
        avatarUrl: user.user_metadata?.avatar_url ?? null,
        role,
        masjidId: roleData?.masjid_id ?? null,
        masjidName: masjid?.name ?? null,
      });
      setLoading(false);
    };
    
    fetchUser();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-light text-sm font-medium">Memuat data sesi...</p>
        </div>
      </div>
    );
  }

  const isPengurus = ['pengurus', 'ketua_dkm', 'bendahara', 'super_admin'].includes(userData?.role ?? '');
  const isSuperAdmin = userData?.role === 'super_admin';

  const navLinkClass = (path: string) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-colors ${
      pathname === path ? 'bg-primary/10 text-primary' : 'text-slate hover:bg-slate-50'
    }`;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col p-6 fixed h-full z-10">
        <Link href="/" className="text-2xl font-bold text-primary mb-2">
          Masjid<span className="text-accent">Link</span>
        </Link>
        {userData?.masjidName && (
          <p className="text-xs text-slate-light font-medium mb-8 truncate">{userData.masjidName}</p>
        )}
        {!userData?.masjidName && <div className="mb-8" />}
        
        <div className="space-y-6 flex-1 overflow-y-auto">
 
          {/* Portal Jama'ah */}
          <div>
            <p className="text-xs font-semibold text-slate-light uppercase tracking-wider mb-3">Portal Jama'ah</p>
            <nav className="flex flex-col gap-1">
              <Link href="/dashboard/jamaah" className={navLinkClass('/dashboard/jamaah')}>
                <Home className="w-4 h-4" /><span>Beranda</span>
              </Link>
              <Link href="/dashboard/jamaah/donasi" className={navLinkClass('/dashboard/jamaah/donasi')}>
                <CreditCard className="w-4 h-4" /><span>Riwayat Donasi</span>
              </Link>
              <Link href="/dashboard/jamaah/program" className={navLinkClass('/dashboard/jamaah/program')}>
                <BookOpen className="w-4 h-4" /><span>Program Masjid</span>
              </Link>
              <Link href="/dashboard/jamaah/notifikasi" className={navLinkClass('/dashboard/jamaah/notifikasi')}>
                <Bell className="w-4 h-4" /><span>Notifikasi & Log WA</span>
              </Link>
            </nav>
          </div>

          {/* Pengurus DKM */}
          {isPengurus && (
            <div>
              <p className="text-xs font-semibold text-slate-light uppercase tracking-wider mb-3">Pengurus DKM</p>
              <nav className="flex flex-col gap-1">
                <Link href="/dashboard/pengurus" className={navLinkClass('/dashboard/pengurus')}>
                  <LayoutDashboard className="w-4 h-4" /><span>Ringkasan Keuangan</span>
                </Link>
                <Link href="/dashboard/pengurus/program" className={navLinkClass('/dashboard/pengurus/program')}>
                  <Settings className="w-4 h-4" /><span>Kelola Program</span>
                </Link>
                <Link href="/dashboard/pengurus/keuangan" className={navLinkClass('/dashboard/pengurus/keuangan')}>
                  <CreditCard className="w-4 h-4" /><span>Keuangan ZISWAF</span>
                </Link>
                <Link href="/dashboard/pengurus/masjidbot" className={navLinkClass('/dashboard/pengurus/masjidbot')}>
                  <MessageSquare className="w-4 h-4" /><span>MasjidBot DKM (AI)</span>
                </Link>
                <Link href="/dashboard/pengurus/prediksi" className={navLinkClass('/dashboard/pengurus/prediksi')}>
                  <TrendingUp className="w-4 h-4" /><span>Prediksi & Anomali (AI)</span>
                </Link>
                <Link href="/dashboard/pengurus/notifikasi" className={navLinkClass('/dashboard/pengurus/notifikasi')}>
                  <Bell className="w-4 h-4" /><span>Notifikasi & Log WA</span>
                </Link>
              </nav>
            </div>
          )}

          {/* Super Admin */}
          {isSuperAdmin && (
            <div>
              <p className="text-xs font-semibold text-slate-light uppercase tracking-wider mb-3">Super Admin</p>
              <nav className="flex flex-col gap-1">
                <Link href="/dashboard/admin/users" className={navLinkClass('/dashboard/admin/users')}>
                  <Users className="w-4 h-4" /><span>Kelola Pengguna</span>
                </Link>
                <Link href="/dashboard/admin/masjid" className={navLinkClass('/dashboard/admin/masjid')}>
                  <ShieldCheck className="w-4 h-4" /><span>Kelola Masjid</span>
                </Link>
              </nav>
            </div>
          )}
        </div>

        {/* User Card & Logout */}
        <div className="mt-auto pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            {userData?.avatarUrl ? (
              <img src={userData.avatarUrl} alt="avatar" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-sm">
                {userData?.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-bold text-slate-dark truncate">{userData?.name}</p>
              <p className="text-xs text-slate-light capitalize">{userData?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full py-2.5 text-sm text-slate-dark hover:text-rose-600 hover:border-rose-100 font-semibold border border-gray-200 rounded-xl bg-white transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
