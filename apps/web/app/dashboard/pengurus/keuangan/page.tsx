'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '../../../../utils/supabase/client';
import { 
  CreditCard, Plus, Loader2, CheckCircle2, AlertCircle, 
  TrendingUp, TrendingDown, Wallet, BookOpen, Printer, FileText, Calendar
} from 'lucide-react';
import type { Program, Transaction, TransactionType } from '../../../../lib/db/types';

const TX_TYPES: { value: TransactionType; label: string; color: string }[] = [
  { value: 'zakat', label: 'Zakat', color: 'text-emerald-600 bg-emerald-50' },
  { value: 'infaq', label: 'Infaq', color: 'text-blue-600 bg-blue-50' },
  { value: 'shodaqoh', label: 'Shodaqoh', color: 'text-indigo-600 bg-indigo-50' },
  { value: 'wakaf', label: 'Wakaf', color: 'text-purple-600 bg-purple-50' },
  { value: 'hibah', label: 'Hibah', color: 'text-teal-600 bg-teal-50' },
  { value: 'pengeluaran', label: 'Pengeluaran', color: 'text-rose-600 bg-rose-50' },
];

export default function KeuanganPage() {
  const supabase = createClient();
  const [masjidId, setMasjidId] = useState<string | null>(null);
  const [masjidName, setMasjidName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'ringkasan' | 'psak409'>('ringkasan');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Data lists
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [approvedPrograms, setApprovedPrograms] = useState<Program[]>([]);
  const [pendingDonations, setPendingDonations] = useState<any[]>([]);

  // Form states
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [incomeForm, setIncomeForm] = useState({ type: 'infaq' as TransactionType, amount: '', description: '' });
  const [expenseForm, setExpenseForm] = useState({ program_id: '', amount: '', description: '' });

  // Date filters for PSAK 409
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchKeuangan = useCallback(async (mid: string) => {
    const [txRes, progRes, donRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('masjid_id', mid).order('created_at', { ascending: false }),
      supabase.from('programs').select('*').eq('masjid_id', mid).eq('status', 'approved'),
      supabase.from('donations').select('*, users(full_name), programs(title)').eq('masjid_id', mid).eq('status', 'pending').order('created_at', { ascending: false }),
    ]);
    setTransactions(txRes.data ?? []);
    setApprovedPrograms(progRes.data ?? []);
    setPendingDonations(donRes.data ?? []);
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: roleData } = await supabase
        .from('user_masjid_roles')
        .select('masjid_id, masjids(name)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleData?.masjid_id) {
        setMasjidId(roleData.masjid_id);
        const masjidsRaw = roleData.masjids as any;
        const name = (Array.isArray(masjidsRaw) ? masjidsRaw[0]?.name : masjidsRaw?.name) || 'Masjid Anda';
        setMasjidName(name);
        await fetchKeuangan(roleData.masjid_id);
      }
      setLoading(false);
    };
    init();
  }, [supabase, fetchKeuangan]);

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masjidId || !incomeForm.amount || Number(incomeForm.amount) <= 0) return;
    setSaving(true);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('transactions').insert({
      masjid_id: masjidId,
      type: incomeForm.type,
      amount: Number(incomeForm.amount),
      description: incomeForm.description || null,
      recorded_by: user?.id,
    });

    if (error) {
      setMessage({ type: 'error', text: `Gagal mencatat pemasukan: ${error.message}` });
    } else {
      setMessage({ type: 'success', text: 'Pemasukan berhasil dicatat.' });
      setIncomeForm({ type: 'infaq', amount: '', description: '' });
      setShowIncomeForm(false);
      await fetchKeuangan(masjidId);
    }
    setSaving(false);
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masjidId || !expenseForm.amount || Number(expenseForm.amount) <= 0) return;
    setSaving(true);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('transactions').insert({
      masjid_id: masjidId,
      type: 'pengeluaran',
      amount: Number(expenseForm.amount),
      description: expenseForm.description || null,
      program_id: expenseForm.program_id || null,
      recorded_by: user?.id,
    });

    if (error) {
      setMessage({ type: 'error', text: `Gagal mencatat pengeluaran: ${error.message}` });
    } else {
      setMessage({ type: 'success', text: 'Pengeluaran berhasil dicatat.' });
      setExpenseForm({ program_id: '', amount: '', description: '' });
      setShowExpenseForm(false);
      await fetchKeuangan(masjidId);
    }
    setSaving(false);
  };

  const handleConfirmDonation = async (don: any) => {
    if (!masjidId) return;
    setSaving(true);
    setMessage(null);

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    // Panggil fungsi RPC database untuk memproses donasi & verifikasi donatur secara aman
    const { error } = await supabase.rpc('confirm_donation_and_verify', {
      donation_id: don.id,
      recorder_id: currentUser.id,
    });

    if (error) {
      setMessage({ type: 'error', text: `Gagal mengonfirmasi donasi: ${error.message}` });
    } else {
      // Log notifications
      const donorName = don.users?.full_name || 'Hamba Allah';
      const formattedAmount = fmt(Number(don.amount));
      const programTitle = don.programs?.title || 'Umum';

      await supabase.from('notification_logs').insert([
        {
          user_id: don.donor_id,
          type: 'whatsapp',
          title: 'Konfirmasi Donasi',
          content: `Assalamualaikum. Donasi Anda sebesar ${formattedAmount} untuk program '${programTitle}' telah berhasil kami terima. Jazakumullah khairan katsiran. Wassalamu'alaikum.`,
          status: 'sent'
        },
        {
          user_id: don.donor_id,
          type: 'email',
          title: 'Resi Tanda Terima Resmi Donasi',
          content: `Masjid Al-Muhajirin - Resi Donasi Resmi Nomor ML-${don.id.substring(0, 8).toUpperCase()}.\nTerima kasih kepada ${donorName} atas donasi sebesar ${formattedAmount} untuk program ${programTitle}. Dana ini telah tercatat dalam kas pembukuan PSAK 409 masjid kami.`,
          status: 'sent'
        },
        {
          user_id: don.donor_id,
          type: 'push',
          title: 'Donasi Terverifikasi!',
          content: `Donasi sebesar ${formattedAmount} telah dikonfirmasi oleh Bendahara. Terima kasih atas kedermawanan Anda.`,
          status: 'sent'
        }
      ]);

      setMessage({ 
        type: 'success', 
        text: `Donasi dari ${donorName} sebesar ${formattedAmount} berhasil dikonfirmasi dan status donatur telah diverifikasi.` 
      });
      await fetchKeuangan(masjidId);
    }
    setSaving(false);
  };

  // Financial calculations
  const filteredTxs = transactions.filter(t => {
    if (startDate && new Date(t.created_at) < new Date(startDate)) return false;
    if (endDate && new Date(t.created_at) > new Date(endDate + 'T23:59:59')) return false;
    return true;
  });

  const totals = filteredTxs.reduce((acc, curr) => {
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

  const printAreaRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => {
    window.print();
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
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-dark mb-1 flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-primary" /> Keuangan & ZISWAF
          </h1>
          <p className="text-slate-light">{masjidName} · Pembukuan Keuangan Syariah PSAK 409</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveTab('ringkasan'); }}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'ringkasan' ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-slate hover:bg-slate-50'
            }`}
          >
            Pencatatan & Ringkasan
          </button>
          <button
            onClick={() => { setActiveTab('psak409'); }}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'psak409' ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-slate hover:bg-slate-50'
            }`}
          >
            Laporan PSAK 409
          </button>
          <a
            href={`/public/keuangan/${masjidId}`} target="_blank" rel="noreferrer"
            className="px-4 py-2 bg-accent text-white text-sm font-bold rounded-xl hover:bg-accent/90 transition-all flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" /> Link Transparansi Publik
          </a>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm print:hidden ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
            : 'bg-rose-50 text-rose-800 border border-rose-100'
        }`}>
          {message.type === 'success'
            ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          {message.text}
        </div>
      )}

      {activeTab === 'ringkasan' && (
        <div className="space-y-6 print:hidden">
          {/* Dashboard Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-light uppercase tracking-wider">Total Pemasukan</p>
                <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
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
                <div className="w-9 h-9 bg-rose-100 rounded-xl flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-rose-600">{fmt(totals.pengeluaran)}</p>
                <p className="text-[10px] text-slate-light mt-1">Pengeluaran terikat program & operasional</p>
              </div>
            </div>

            <div className="bg-primary rounded-3xl shadow-md p-6 text-white flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">Saldo Kas Bersih</p>
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-extrabold">{fmt(saldo)}</p>
                <p className="text-[10px] opacity-70 mt-1">Sisa kas lancar terkonsolidasi</p>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => { setShowIncomeForm(!showIncomeForm); setShowExpenseForm(false); }}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-2xl hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Catat Pemasukan
            </button>
            <button
              onClick={() => { setShowExpenseForm(!showExpenseForm); setShowIncomeForm(false); }}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-rose-600 text-white text-sm font-semibold rounded-2xl hover:bg-rose-700 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Catat Pengeluaran
            </button>
          </div>

          {/* Income Form */}
          {showIncomeForm && (
            <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6">
              <h2 className="text-base font-bold text-slate-dark mb-4">Catat Pemasukan Dana (ZISWAF)</h2>
              <form onSubmit={handleIncomeSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-light uppercase mb-1.5">Jenis Dana</label>
                  <select
                    value={incomeForm.type}
                    onChange={e => setIncomeForm(p => ({ ...p, type: e.target.value as TransactionType }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white text-slate-dark"
                  >
                    <option value="infaq">Infaq</option>
                    <option value="zakat">Zakat</option>
                    <option value="shodaqoh">Shodaqoh</option>
                    <option value="wakaf">Wakaf</option>
                    <option value="hibah">Hibah / Operasional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-light uppercase mb-1.5">Jumlah Nominal (Rp)</label>
                  <input
                    required type="number" placeholder="cth. 150000"
                    value={incomeForm.amount}
                    onChange={e => setIncomeForm(p => ({ ...p, amount: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-light uppercase mb-1.5">Keterangan / Nama Donatur</label>
                  <input
                    type="text" placeholder="cth. Hamba Allah - Infaq Jumat"
                    value={incomeForm.description}
                    onChange={e => setIncomeForm(p => ({ ...p, description: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="sm:col-span-3 flex justify-end">
                  <button
                    type="submit" disabled={saving}
                    className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-2xl hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Transaksi Pemasukan'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Expense Form */}
          {showExpenseForm && (
            <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6">
              <h2 className="text-base font-bold text-slate-dark mb-4">Catat Pengeluaran Dana Kas</h2>
              <form onSubmit={handleExpenseSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-light uppercase mb-1.5">Alokasi Program Terkait</label>
                  <select
                    value={expenseForm.program_id}
                    onChange={e => setExpenseForm(p => ({ ...p, program_id: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white text-slate-dark"
                  >
                    <option value="">Operasional Umum (Tanpa Program)</option>
                    {approvedPrograms.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-light uppercase mb-1.5">Jumlah Nominal (Rp)</label>
                  <input
                    required type="number" placeholder="cth. 500000"
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-light uppercase mb-1.5">Keterangan Pengeluaran</label>
                  <input
                    type="text" placeholder="cth. Pembelian soundsystem mihrab"
                    value={expenseForm.description}
                    onChange={e => setExpenseForm(p => ({ ...p, description: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="sm:col-span-3 flex justify-end">
                  <button
                    type="submit" disabled={saving}
                    className="px-5 py-2.5 bg-rose-600 text-white text-sm font-semibold rounded-2xl hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Transaksi Pengeluaran'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Pending Donations Checklist (PORT-05) */}
          {pendingDonations.length > 0 && (
            <div className="bg-white border border-amber-100 rounded-3xl shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-amber-100 bg-amber-50/30 flex items-center justify-between">
                <h3 className="font-bold text-amber-900 text-base">Donasi Menunggu Konfirmasi (Kode Unik)</h3>
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                  {pendingDonations.length} Butuh Konfirmasi
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {pendingDonations.map(don => {
                  const donor = don.users?.full_name || 'Hamba Allah';
                  return (
                    <div key={don.id} className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-dark">{donor}</p>
                          {don.unique_code && (
                            <span className="text-[10px] bg-primary/10 text-primary font-mono px-2 py-0.5 rounded font-bold">
                              Kode Unik: {don.unique_code}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-light mt-1">
                          Program: {don.programs?.title || 'Umum'} · Dibuat: {new Date(don.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 self-end sm:self-auto shrink-0">
                        <p className="text-sm font-black text-slate-dark">{fmt(Number(don.amount))}</p>
                        <button
                          onClick={() => handleConfirmDonation(don)}
                          disabled={saving}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                        >
                          Konfirmasi Pembayaran
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Transactions List */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="font-bold text-slate-dark text-base">Arus Kas & Mutasi Rekening Terakhir</h3>
            </div>
            {filteredTxs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-light">
                <FileText className="w-12 h-12 mb-3 opacity-30" />
                <p className="font-medium">Belum ada transaksi</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-100 text-left text-xs uppercase text-slate-light tracking-wider font-semibold">
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Jenis Transaksi</th>
                    <th className="px-6 py-4">Keterangan</th>
                    <th className="px-6 py-4 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTxs.map(t => {
                    const opt = TX_TYPES.find(o => o.value === t.type);
                    const isExpense = t.type === 'pengeluaran';
                    return (
                      <tr key={t.id} className="border-b border-gray-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-slate-light">
                          {new Date(t.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${opt?.color || 'bg-gray-100 text-gray-700'}`}>
                            {opt?.label || t.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-dark font-medium">
                          {t.description || 'Tanpa keterangan'}
                        </td>
                        <td className={`px-6 py-4 text-right font-bold ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {isExpense ? '- ' : '+ '}{fmt(Number(t.amount))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: PSAK 409 Report Section */}
      {activeTab === 'psak409' && (
        <div className="space-y-6">
          {/* Controls Panel */}
          <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 flex flex-wrap items-end justify-between gap-4 print:hidden">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-light" />
                <span className="text-xs font-semibold text-slate-light uppercase">Filter Periode</span>
              </div>
              <input
                type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs text-slate focus:outline-none"
              />
              <span className="text-xs font-semibold text-slate-light">s.d</span>
              <input
                type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs text-slate focus:outline-none"
              />
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/95 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Cetak Laporan PSAK 409
            </button>
          </div>

          {/* Printable Report Document */}
          <div ref={printAreaRef} className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 sm:p-12 font-sans text-slate-dark max-w-4xl mx-auto print:border-0 print:shadow-none print:p-0">
            {/* Header Laporan */}
            <div className="text-center border-b-2 border-slate-dark pb-6 mb-8">
              <h2 className="text-2xl font-black uppercase text-slate-dark tracking-wide">{masjidName}</h2>
              <p className="text-sm font-semibold text-slate-light tracking-wider mt-1">LAPORAN KEUANGAN SYARIAH MASJID (STANDAR PSAK 409)</p>
              <p className="text-xs text-slate-light mt-0.5">
                {startDate ? `Periode ${new Date(startDate).toLocaleDateString('id-ID', { dateStyle: 'long' })}` : 'Semua Periode'}
                {endDate ? ` s.d ${new Date(endDate).toLocaleDateString('id-ID', { dateStyle: 'long' })}` : ''}
              </p>
            </div>

            {/* Bagian I: Laporan Sumber & Penyaluran Dana Zakat */}
            <div className="mb-8">
              <h3 className="text-sm font-extrabold text-slate-dark uppercase border-b border-gray-200 pb-1.5 mb-3 tracking-wide flex items-center gap-2">
                <span className="w-2 h-4 bg-emerald-600 rounded-sm"></span> A. LAPORAN DANA ZAKAT
              </h3>
              <table className="w-full text-xs">
                <tbody>
                  <tr className="border-b border-gray-100 font-bold bg-slate-50/50">
                    <td className="py-2.5 px-3">1. Penerimaan Dana Zakat</td>
                    <td className="py-2.5 px-3 text-right">{fmt(totals.zakat)}</td>
                  </tr>
                  <tr className="border-b border-gray-100 text-slate-light">
                    <td className="py-2 px-3 pl-8">· Muzakki Individu / Jamaah</td>
                    <td className="py-2 px-3 text-right">{fmt(totals.zakat)}</td>
                  </tr>
                  <tr className="border-b border-gray-100 font-bold bg-slate-50/50">
                    <td className="py-2.5 px-3">2. Penyaluran / Penggunaan Dana Zakat</td>
                    <td className="py-2.5 px-3 text-right">{fmt(0) /* Zakat is general, normally managed by amil */}</td>
                  </tr>
                  <tr className="border-b border-gray-100 font-black text-emerald-600 bg-emerald-50/40">
                    <td className="py-2.5 px-3">SURPLUS / SALDO DANA ZAKAT PERIODE INI</td>
                    <td className="py-2.5 px-3 text-right">{fmt(totals.zakat)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bagian II: Laporan Dana Infaq & Shodaqoh */}
            <div className="mb-8">
              <h3 className="text-sm font-extrabold text-slate-dark uppercase border-b border-gray-200 pb-1.5 mb-3 tracking-wide flex items-center gap-2">
                <span className="w-2 h-4 bg-blue-600 rounded-sm"></span> B. LAPORAN DANA INFAQ & SHODAQOH
              </h3>
              <table className="w-full text-xs">
                <tbody>
                  <tr className="border-b border-gray-100 font-bold bg-slate-50/50">
                    <td className="py-2.5 px-3">1. Penerimaan Dana Infaq & Shodaqoh</td>
                    <td className="py-2.5 px-3 text-right">{fmt(totals.infaq + totals.shodaqoh)}</td>
                  </tr>
                  <tr className="border-b border-gray-100 text-slate-light">
                    <td className="py-2 px-3 pl-8">· Infaq Masjid Terikat & Tidak Terikat</td>
                    <td className="py-2 px-3 text-right">{fmt(totals.infaq)}</td>
                  </tr>
                  <tr className="border-b border-gray-100 text-slate-light">
                    <td className="py-2 px-3 pl-8">· Shodaqoh Sukarela</td>
                    <td className="py-2 px-3 text-right">{fmt(totals.shodaqoh)}</td>
                  </tr>
                  <tr className="border-b border-gray-100 font-bold bg-slate-50/50">
                    <td className="py-2.5 px-3">2. Penggunaan Dana Infaq & Shodaqoh</td>
                    <td className="py-2.5 px-3 text-right">{fmt(totals.pengeluaran)}</td>
                  </tr>
                  <tr className="border-b border-gray-100 text-slate-light">
                    <td className="py-2 px-3 pl-8">· Penyaluran untuk Program Masjid & Operasional</td>
                    <td className="py-2 px-3 text-right">{fmt(totals.pengeluaran)}</td>
                  </tr>
                  <tr className="border-b border-gray-100 font-black text-blue-600 bg-blue-50/40">
                    <td className="py-2.5 px-3">SURPLUS / SALDO DANA INFAQ & SHODAQOH PERIODE INI</td>
                    <td className="py-2.5 px-3 text-right">{fmt((totals.infaq + totals.shodaqoh) - totals.pengeluaran)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bagian III: Dana Wakaf & Hibah */}
            <div className="mb-8">
              <h3 className="text-sm font-extrabold text-slate-dark uppercase border-b border-gray-200 pb-1.5 mb-3 tracking-wide flex items-center gap-2">
                <span className="w-2 h-4 bg-purple-600 rounded-sm"></span> C. LAPORAN DANA TEMPORER & WAKAF / HIBAH
              </h3>
              <table className="w-full text-xs">
                <tbody>
                  <tr className="border-b border-gray-100 font-bold bg-slate-50/50">
                    <td className="py-2.5 px-3">1. Penerimaan Dana Wakaf (Aset Abadi)</td>
                    <td className="py-2.5 px-3 text-right">{fmt(totals.wakaf)}</td>
                  </tr>
                  <tr className="border-b border-gray-100 font-bold bg-slate-50/50">
                    <td className="py-2.5 px-3">2. Penerimaan Dana Hibah / Operasional Umum</td>
                    <td className="py-2.5 px-3 text-right">{fmt(totals.hibah)}</td>
                  </tr>
                  <tr className="border-b border-gray-100 font-black text-purple-600 bg-purple-50/40">
                    <td className="py-2.5 px-3">SALDO DANA WAKAF & HIBAH PERIODE INI</td>
                    <td className="py-2.5 px-3 text-right">{fmt(totals.wakaf + totals.hibah)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Konsolidasi Posisi Keuangan Lancar (PSAK 409) */}
            <div className="border-t-2 border-slate-dark pt-6 mt-10">
              <div className="flex justify-between items-center bg-slate-900 text-white rounded-xl p-4">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white/70">TOTAL KONSOLIDASI SALDO KAS MASJID (PSAK 409)</h4>
                  <p className="text-[10px] text-white/50 mt-0.5">Saldo terhitung bersih mencakup kas tunai dan bank di seluruh pos dana.</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black">{fmt(saldo)}</p>
                </div>
              </div>
            </div>

            {/* Signature Area (Ramah Print) */}
            <div className="hidden print:flex justify-between mt-20 text-xs px-10">
              <div className="text-center">
                <p>Mengetahui,</p>
                <p className="font-bold mt-16">Ketua DKM</p>
              </div>
              <div className="text-center">
                <p>Dibuat oleh,</p>
                <p className="font-bold mt-16">Bendahara Masjid</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
