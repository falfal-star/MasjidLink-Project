'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';
import { 
  Lock, 
  Mail, 
  User, 
  MapPin, 
  Phone, 
  ArrowRight, 
  Loader2, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Check if already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push('/dashboard/jamaah');
      }
    };
    checkUser();
  }, [router, supabase.auth]);

  const handleOAuthLogin = async () => {
    try {
      setMessage(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal masuk dengan Google' });
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isLogin) {
        // Sign In Flow
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        setMessage({ type: 'success', text: 'Berhasil masuk! Mengalihkan...' });
        setTimeout(() => {
          router.push('/dashboard/jamaah');
        }, 1500);
      } else {
        // Sign Up Flow
        if (!fullName || !phone || !address) {
          throw new Error('Semua data pendaftaran wajib diisi.');
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phone,
              address: address,
              role: 'jamaah', // default role
            },
          },
        });
        if (error) throw error;

        setMessage({ 
          type: 'success', 
          text: 'Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi akun.' 
        });
        
        // Reset form
        setEmail('');
        setPassword('');
        setFullName('');
        setPhone('');
        setAddress('');
        setIsLogin(true);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Terjadi kesalahan sistem' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Back to Home Link */}
      <div className="absolute top-6 left-6">
        <Link href="/" className="flex items-center gap-2 text-slate hover:text-primary transition-colors font-medium">
          <ArrowRight className="rotate-180 w-4 h-4" />
          Kembali ke Beranda
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="text-3xl font-extrabold text-primary mb-2">
          Masjid<span className="text-accent">Link</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-dark tracking-tight">
          {isLogin ? 'Masuk ke akun Anda' : 'Buat akun baru Jama\'ah'}
        </h2>
        <p className="mt-2 text-sm text-slate-light">
          {isLogin ? 'Atau ' : 'Sudah punya akun? '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage(null);
            }}
            className="font-medium text-accent hover:text-accent-dark transition-colors outline-none cursor-pointer"
          >
            {isLogin ? 'daftar akun baru gratis' : 'masuk ke akun Anda'}
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl border border-gray-100 rounded-3xl sm:px-10">
          
          {/* Notification Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-2xl flex items-start gap-3 text-sm ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                : 'bg-rose-50 text-rose-800 border border-rose-100'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Social Sign-In Button (Google) */}
          <button
            onClick={handleOAuthLogin}
            type="button"
            className="w-full flex justify-center items-center gap-3 px-4 py-3 border border-gray-200 rounded-2xl shadow-sm bg-white text-sm font-medium text-slate-dark hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            <span>Masuk dengan Google</span>
          </button>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-light">Atau menggunakan email</span>
              </div>
            </div>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleEmailAuth}>
            
            {/* Input Nama Lengkap (Hanya saat Register) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Nama Lengkap
                </label>
                <div className="relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 h-5 text-slate-light" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl bg-white text-slate-dark placeholder-slate-light focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                    placeholder="Nama Lengkap sesuai KTP"
                  />
                </div>
              </div>
            )}

            {/* Input Email */}
            <div>
              <label className="block text-sm font-medium text-slate-dark mb-1">
                Alamat Email
              </label>
              <div className="relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 h-5 text-slate-light" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl bg-white text-slate-dark placeholder-slate-light focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {/* Input Nomor Telepon (Hanya saat Register) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Nomor Telepon
                </label>
                <div className="relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 h-5 text-slate-light" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl bg-white text-slate-dark placeholder-slate-light focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                    placeholder="0812xxxxxxxx"
                  />
                </div>
              </div>
            )}

            {/* Input Alamat Lengkap (Hanya saat Register) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Alamat Lengkap
                </label>
                <div className="relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-4 pt-3 flex items-start pointer-events-none">
                    <MapPin className="h-5 h-5 text-slate-light" />
                  </div>
                  <textarea
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl bg-white text-slate-dark placeholder-slate-light focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                    placeholder="Alamat lengkap domisili saat ini"
                  />
                </div>
              </div>
            )}

            {/* Input Password */}
            <div>
              <label className="block text-sm font-medium text-slate-dark mb-1">
                Kata Sandi
              </label>
              <div className="relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 h-5 text-slate-light" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl bg-white text-slate-dark placeholder-slate-light focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                  placeholder="Min. 6 karakter"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 px-4 py-3 border border-transparent rounded-2xl shadow-md text-sm font-semibold text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isLogin ? (
                  'Masuk Sekarang'
                ) : (
                  'Daftar Sebagai Jama\'ah'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
