'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '../../../../utils/supabase/client';
import { 
  Bell, Loader2, MessageSquare, Mail, Smartphone, 
  CheckCheck, Info, Search, Award
} from 'lucide-react';

interface NotificationLog {
  id: string;
  user_id: string;
  type: 'whatsapp' | 'email' | 'push';
  title: string;
  content: string;
  status: string;
  created_at: string;
  users?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export default function PengurusNotifikasiPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'whatsapp' | 'email' | 'push'>('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('notification_logs')
      .select('*, users(full_name, email)')
      .order('created_at', { ascending: false });

    const fetched = (data as NotificationLog[]) ?? [];
    setLogs(fetched);
    if (fetched.length > 0 && !selectedLog) {
      setSelectedLog(fetched[0] ?? null);
    }
    setLoading(false);
  }, [supabase, selectedLog]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.type === filter;
    const name = log.users?.full_name || 'Hamba Allah';
    const email = log.users?.email || '';
    const content = log.content || '';
    const title = log.title || '';
    
    const matchesSearch = 
      name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase()) ||
      content.toLowerCase().includes(search.toLowerCase()) ||
      title.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

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

  // Stats counters
  const totalLogs = logs.length;
  const totalWa = logs.filter(l => l.type === 'whatsapp').length;
  const totalEmail = logs.filter(l => l.type === 'email').length;
  const totalPush = logs.filter(l => l.type === 'push').length;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-dark mb-1 flex items-center gap-3">
          <Bell className="w-8 h-8 text-primary" />
          Audit & Log Notifikasi Masjid
        </h1>
        <p className="text-slate-light">Pemantauan real-time pengiriman notifikasi Fonnte WhatsApp, FCM Push, dan Email Resi Kuitansi.</p>
      </div>

      {/* Audit Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-semibold text-slate-light uppercase tracking-wider">Total Outgoing Logs</p>
          <div className="flex items-baseline gap-1 mt-3">
            <span className="text-2xl font-black text-slate-dark">{totalLogs}</span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">100% Sent</span>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <p className="text-xs font-semibold text-slate-light uppercase tracking-wider">WhatsApp Fonnte</p>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          </div>
          <div className="flex items-baseline gap-1 mt-3">
            <span className="text-2xl font-black text-emerald-600">{totalWa}</span>
            <span className="text-[10px] text-slate-light font-bold">API Active</span>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-semibold text-slate-light uppercase tracking-wider">Email SMTP</p>
          <div className="flex items-baseline gap-1 mt-3">
            <span className="text-2xl font-black text-blue-600">{totalEmail}</span>
            <span className="text-[10px] text-slate-light font-bold">Resi Otomatis</span>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-semibold text-slate-light uppercase tracking-wider">Push Alert (FCM)</p>
          <div className="flex items-baseline gap-1 mt-3">
            <span className="text-2xl font-black text-indigo-600">{totalPush}</span>
            <span className="text-[10px] text-slate-light font-bold">Service Worker</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Audit Table & Filter */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-light absolute left-4 top-3.5" />
              <input
                type="text"
                placeholder="Cari jamaah, isi pesan, atau judul..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl border border-gray-100 shrink-0 self-start sm:self-auto">
              {(['all', 'whatsapp', 'email', 'push'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs font-bold capitalize rounded-xl transition-all cursor-pointer ${
                    filter === f 
                      ? 'bg-white text-slate-dark shadow-sm border border-gray-100' 
                      : 'text-slate-light hover:text-slate-dark'
                  }`}
                >
                  {f === 'all' ? 'Semua' : f}
                </button>
              ))}
            </div>
          </div>

          {/* Audit List Table Card */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-slate-light text-center px-6">
                <Bell className="w-12 h-12 mb-3 opacity-30" />
                <p className="font-semibold text-sm">Tidak ditemukan logs</p>
                <p className="text-xs mt-1">Belum ada aktivitas pengiriman notifikasi yang cocok.</p>
              </div>
            ) : (
              filteredLogs.map(log => {
                const userName = log.users?.full_name || 'Hamba Allah';
                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`p-4 flex items-center justify-between gap-4 transition-colors cursor-pointer text-left relative ${
                      selectedLog?.id === log.id 
                        ? 'bg-primary/5 hover:bg-primary/5' 
                        : 'hover:bg-slate-50/50'
                    }`}
                  >
                    {selectedLog?.id === log.id && (
                      <div className="absolute left-0 top-0 w-1 h-full bg-primary" />
                    )}
                    <div className="flex gap-3 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 self-start mt-0.5 ${getBadgeClass(log.type)}`}>
                        {getIcon(log.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-dark truncate">{userName}</span>
                          <span className="text-[9px] text-slate-light uppercase font-mono tracking-wider font-bold">({log.type})</span>
                        </div>
                        <p className="text-xs text-slate-dark font-medium mt-0.5 truncate">{log.title}</p>
                        <p className="text-[10px] text-slate-light line-clamp-1">{log.content}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-light block">{fmtDate(log.created_at)}</span>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded border border-emerald-100">
                        {log.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Simulator Device Mock-up */}
        <div className="lg:col-span-5">
          {selectedLog ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-light flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-primary" /> Simulator Penerima Donatur
                </span>
                <span className="text-[10px] font-black px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
                  Audited
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
                  <div className="p-4 space-y-4 min-h-[280px] max-h-[340px] overflow-y-auto flex flex-col justify-end">
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
                    <div className="flex-1 bg-white rounded-full px-4 py-1 text-xs text-slate-light text-left">
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
                <div className="bg-white border border-gray-200 rounded-3xl shadow-lg p-5 text-left font-sans max-w-sm mx-auto">
                  {/* Letterhead */}
                  <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-3">
                    <div>
                      <h2 className="text-sm font-black text-slate-dark">MASJID AL-MUHAJIRIN</h2>
                      <p className="text-[8px] text-slate-light font-medium tracking-wide">Receipt Platform</p>
                    </div>
                    <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-bold text-xs shrink-0">
                      ML
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="space-y-3">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex gap-2">
                      <Award className="w-6 h-6 text-emerald-600 shrink-0" />
                      <div>
                        <h4 className="text-[10px] font-bold text-emerald-900">Tanda Terima Resmi</h4>
                        <p className="text-[8px] text-emerald-800/80 leading-snug">Sah tercatat dalam kas pembukuan PSAK 409 masjid.</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-[10px]">
                      <div className="flex justify-between border-b border-gray-100 pb-1.5">
                        <span className="text-slate-light">No. Transaksi</span>
                        <span className="font-mono font-bold text-slate-dark">ML-{selectedLog.id.substring(0, 8).toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-1.5">
                        <span className="text-slate-light">Waktu</span>
                        <span className="font-semibold text-slate-dark">{fmtDate(selectedLog.created_at)}</span>
                      </div>
                      <div className="flex justify-between pt-0.5">
                        <span className="text-slate-light">Penerima</span>
                        <span className="font-bold text-slate-dark">{selectedLog.users?.full_name || 'Hamba Allah'}</span>
                      </div>
                      <div className="pt-1.5 text-[9px] text-slate-light leading-relaxed whitespace-pre-line border-t border-gray-100">
                        {selectedLog.content}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. PUSH NOTIFICATION SIMULATOR */}
              {selectedLog.type === 'push' && (
                <div className="bg-slate-900 border border-slate-800 rounded-[36px] p-5 shadow-xl max-w-sm mx-auto relative select-none">
                  {/* Smartphone Top Notch */}
                  <div className="w-20 h-3 bg-black rounded-full mx-auto mb-6"></div>

                  {/* Banner Mockup */}
                  <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-md flex gap-2.5 text-left">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shrink-0">
                      <Bell className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-[10px] text-slate-dark">MasjidLink App</p>
                        <span className="text-[8px] text-slate-light">sekarang</span>
                      </div>
                      <p className="font-bold text-[10px] text-slate-dark mt-0.5">{selectedLog.title}</p>
                      <p className="text-[9px] text-slate-light leading-snug line-clamp-2">{selectedLog.content}</p>
                    </div>
                  </div>

                  <div className="w-24 h-1 bg-white/40 rounded-full mx-auto mt-16"></div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 rounded-3xl text-slate-light h-full min-h-[250px]">
              <Bell className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-bold text-sm">Pilih Log Audit</p>
              <p className="text-xs text-slate-light mt-1">Klik salah satu baris log di sebelah kiri untuk melihat mockup tampilan penerima.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
