'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '../../../../utils/supabase/client';
import { 
  Bell, Loader2, MessageSquare, Mail, Smartphone, 
  CheckCheck, Info, Printer, Award
} from 'lucide-react';

interface NotificationLog {
  id: string;
  user_id: string;
  type: 'whatsapp' | 'email' | 'push';
  title: string;
  content: string;
  status: string;
  created_at: string;
}

export default function JamaahNotifikasiPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);
  const [filter, setFilter] = useState<'all' | 'whatsapp' | 'email' | 'push'>('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('notification_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setLogs((data as NotificationLog[]) ?? []);
    if (data && data.length > 0 && !selectedLog) {
      setSelectedLog(data[0] ?? null);
    }
    setLoading(false);
  }, [supabase, selectedLog]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter(log => filter === 'all' || log.type === filter);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  const getIcon = (type: string) => {
    switch (type) {
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      case 'email':
        return <Mail className="w-4 h-4 text-blue-600" />;
      case 'push':
        return <Smartphone className="w-4 h-4 text-indigo-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate" />;
    }
  };

  const getBadgeClass = (type: string) => {
    switch (type) {
      case 'whatsapp':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'email':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'push':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      default:
        return 'bg-slate-50 text-slate border-slate-100';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-dark mb-1 flex items-center gap-3">
          <Bell className="w-8 h-8 text-primary" />
          Kotak Masuk Notifikasi
        </h1>
        <p className="text-slate-light">Simulasi pengiriman WhatsApp Fonnte, Push Alert, dan Email Receipt donasi Anda.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Notification List */}
        <div className="lg:col-span-5 space-y-4">
          {/* Filters */}
          <div className="flex gap-1.5 p-1 bg-slate-100 rounded-2xl border border-gray-100">
            {(['all', 'whatsapp', 'email', 'push'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-1.5 text-xs font-bold capitalize rounded-xl transition-all cursor-pointer ${
                  filter === f 
                    ? 'bg-white text-slate-dark shadow-sm border border-gray-100' 
                    : 'text-slate-light hover:text-slate-dark'
                }`}
              >
                {f === 'all' ? 'Semua' : f}
              </button>
            ))}
          </div>

          {/* List Card */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-slate-light text-center px-6">
                <Bell className="w-12 h-12 mb-3 opacity-30 animate-pulse" />
                <p className="font-semibold text-sm">Belum ada notifikasi</p>
                <p className="text-xs mt-1">Coba daftar kegiatan atau bayar donasi untuk memicu notifikasi otomatis.</p>
              </div>
            ) : (
              filteredLogs.map(log => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`p-5 flex gap-4 transition-colors cursor-pointer text-left relative ${
                    selectedLog?.id === log.id 
                      ? 'bg-primary/5 hover:bg-primary/5' 
                      : 'hover:bg-slate-50/50'
                  }`}
                >
                  {selectedLog?.id === log.id && (
                    <div className="absolute left-0 top-0 w-1 h-full bg-primary" />
                  )}
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${getBadgeClass(log.type)}`}>
                    {getIcon(log.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-light font-mono">{log.type}</span>
                      <span className="text-[10px] text-slate-light shrink-0">{fmtDate(log.created_at)}</span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-dark mt-1 truncate">{log.title}</h3>
                    <p className="text-xs text-slate-light mt-0.5 line-clamp-1">{log.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Simulator Device Mock-up */}
        <div className="lg:col-span-7">
          {selectedLog ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-light flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-primary" /> Simulator Tampilan Layar
                </span>
                <span className="text-xs font-black px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-mono">
                  Gateway: Fonnte & Supabase
                </span>
              </div>

              {/* 1. WHATSAPP SIMULATOR */}
              {selectedLog.type === 'whatsapp' && (
                <div className="bg-[#efeae2] border border-gray-300 rounded-[36px] shadow-lg overflow-hidden max-w-sm mx-auto relative select-none">
                  {/* Phone Header */}
                  <div className="bg-[#075e54] text-white px-6 py-4 pt-8 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-800 flex items-center justify-center font-bold text-sm text-white shrink-0">
                      ML
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm leading-tight">MasjidLink Notify</p>
                      <p className="text-[10px] text-emerald-100">Online (Fonnte API)</p>
                    </div>
                  </div>

                  {/* Chat Area */}
                  <div className="p-4 space-y-4 min-h-[320px] max-h-[380px] overflow-y-auto flex flex-col justify-end">
                    <div className="self-center bg-[#d1ebf7] text-[#303030] text-[10px] font-semibold py-1 px-3 rounded-lg shadow-sm mb-4">
                      Pesan enkripsi end-to-end MasjidLink
                    </div>

                    <div className="bg-white rounded-2xl rounded-tl-none p-3 shadow-sm max-w-[85%] self-start relative text-left">
                      <p className="text-xs text-slate-dark leading-relaxed whitespace-pre-line">{selectedLog.content}</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-light">
                        <span>{new Date(selectedLog.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                        <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
                      </div>
                    </div>
                  </div>

                  {/* Input Bar Mockup */}
                  <div className="bg-[#f0f0f0] p-3 flex gap-2 border-t border-gray-200">
                    <div className="flex-1 bg-white rounded-full px-4 py-1.5 text-xs text-slate-light text-left">
                      Ketik pesan...
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center text-white shrink-0">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. EMAIL RECEIPT SIMULATOR */}
              {selectedLog.type === 'email' && (
                <div className="bg-white border border-gray-200 rounded-3xl shadow-lg p-6 sm:p-8 text-left font-sans max-w-lg mx-auto">
                  {/* Letterhead */}
                  <div className="flex justify-between items-start border-b border-gray-100 pb-5 mb-5">
                    <div>
                      <h2 className="text-lg font-black text-slate-dark">MASJID AL-MUHAJIRIN</h2>
                      <p className="text-[10px] text-slate-light font-medium tracking-wide">MasjidLink Digital Receipt Platform</p>
                      <p className="text-[9px] text-slate-light mt-0.5">Jln. Kebon Jeruk No. 12, Jakarta Barat</p>
                    </div>
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
                      ML
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex gap-3">
                      <Award className="w-8 h-8 text-emerald-600 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-emerald-900">Tanda Terima Donasi Resmi</h4>
                        <p className="text-[10px] text-emerald-800/80 mt-0.5 leading-relaxed">Terima kasih atas kedermawanan Anda. Transaksi ini diverifikasi dan sah tercatat sebagai amal jariyah.</p>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <h3 className="text-xs font-bold text-slate-light uppercase tracking-wider">Rincian Resi Donasi</h3>
                      
                      <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                        <div className="flex justify-between text-xs border-b border-gray-100 pb-2">
                          <span className="text-slate-light">No. Transaksi</span>
                          <span className="font-mono font-bold text-slate-dark">ML-{selectedLog.id.substring(0, 8).toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between text-xs border-b border-gray-100 pb-2">
                          <span className="text-slate-light">Waktu Penerimaan</span>
                          <span className="font-semibold text-slate-dark">{fmtDate(selectedLog.created_at)}</span>
                        </div>
                        <div className="flex justify-between text-xs pt-1">
                          <span className="text-slate-light">Pesan Tanda Terima</span>
                          <span className="text-right font-medium text-slate-dark max-w-[65%] leading-relaxed">{selectedLog.content}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Print Button simulation */}
                  <div className="flex justify-end gap-2 mt-6 border-t border-gray-100 pt-4">
                    <button 
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> Cetak Bukti PDF
                    </button>
                  </div>
                </div>
              )}

              {/* 3. PUSH NOTIFICATION SIMULATOR */}
              {selectedLog.type === 'push' && (
                <div className="bg-slate-900 border border-slate-800 rounded-[36px] p-6 shadow-xl max-w-sm mx-auto relative select-none">
                  {/* Smartphone Top Notch */}
                  <div className="w-24 h-4 bg-black rounded-full mx-auto mb-8"></div>

                  {/* Banner Mockup */}
                  <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-md flex gap-3 text-left animate-bounce">
                    <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-xs text-slate-dark">MasjidLink App</p>
                        <span className="text-[9px] text-slate-light">sekarang</span>
                      </div>
                      <p className="font-bold text-xs text-slate-dark mt-0.5">{selectedLog.title}</p>
                      <p className="text-[10px] text-slate-light mt-0.5 leading-snug line-clamp-2">{selectedLog.content}</p>
                    </div>
                  </div>

                  {/* Phone Screen Bottom line */}
                  <div className="w-32 h-1 bg-white/40 rounded-full mx-auto mt-20"></div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 rounded-3xl text-slate-light h-full min-h-[300px]">
              <Bell className="w-12 h-12 mb-3 opacity-30 animate-pulse" />
              <p className="font-bold text-sm">Pilih Log Notifikasi</p>
              <p className="text-xs text-slate-light mt-1">Klik salah satu notifikasi di sebelah kiri untuk menampilkan visualisasi mockup.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
