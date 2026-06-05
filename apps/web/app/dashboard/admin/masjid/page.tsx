'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '../../../../utils/supabase/client';
import { Building2, Plus, Loader2, CheckCircle2, AlertCircle, MapPin, X } from 'lucide-react';
import type { Masjid } from '../../../../lib/db/types';

export default function AdminMasjidPage() {
  const supabase = createClient();
  const [masjids, setMasjids] = useState<Masjid[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({ name: '', address: '', city: '', province: '' });

  const fetchMasjids = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('masjids').select('*').order('created_at', { ascending: false });
    setMasjids(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchMasjids(); }, [fetchMasjids]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    setMessage(null);

    const { error } = await supabase.from('masjids').insert({
      name: form.name,
      address: form.address || null,
      city: form.city || null,
      province: form.province || null,
    });

    if (error) {
      setMessage({ type: 'error', text: `Gagal menambah masjid: ${error.message}` });
    } else {
      setMessage({ type: 'success', text: `Masjid "${form.name}" berhasil ditambahkan.` });
      setForm({ name: '', address: '', city: '', province: '' });
      setShowForm(false);
      await fetchMasjids();
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-dark mb-1 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-primary" />
            Kelola Masjid
          </h1>
          <p className="text-slate-light">Tambah dan kelola data masjid yang terdaftar di MasjidLink.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-2xl hover:bg-primary/90 transition-colors cursor-pointer"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Batal' : 'Tambah Masjid'}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
            : 'bg-rose-50 text-rose-800 border border-rose-100'
        }`}>
          {message.type === 'success'
            ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Form Tambah Masjid */}
      {showForm && (
        <div className="mb-8 bg-white border border-gray-100 rounded-3xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-dark mb-5">Data Masjid Baru</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-light uppercase tracking-wider mb-1.5">Nama Masjid *</label>
              <input
                required
                type="text"
                placeholder="cth. Masjid Raya Al-Bina"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm text-slate-dark placeholder-slate-light focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-light uppercase tracking-wider mb-1.5">Alamat</label>
              <input
                type="text"
                placeholder="Jl. Raya No. 1"
                value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm text-slate-dark placeholder-slate-light focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-light uppercase tracking-wider mb-1.5">Kota</label>
              <input
                type="text"
                placeholder="Jakarta"
                value={form.city}
                onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm text-slate-dark placeholder-slate-light focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-light uppercase tracking-wider mb-1.5">Provinsi</label>
              <input
                type="text"
                placeholder="DKI Jakarta"
                value={form.province}
                onChange={e => setForm(p => ({ ...p, province: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm text-slate-dark placeholder-slate-light focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white text-sm font-semibold rounded-2xl hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Simpan Masjid
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Masjid List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : masjids.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 text-slate-light">
          <Building2 className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium">Belum ada masjid yang terdaftar</p>
          <p className="text-sm mt-1">Klik "Tambah Masjid" untuk memulai</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {masjids.map(masjid => (
            <div key={masjid.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-dark text-lg leading-tight">{masjid.name}</h3>
                  {(masjid.city || masjid.province) && (
                    <p className="text-sm text-primary font-medium mt-0.5">
                      {[masjid.city, masjid.province].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {masjid.address && (
                    <p className="text-sm text-slate-light mt-1 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      {masjid.address}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
