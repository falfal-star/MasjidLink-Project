'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '../../../../utils/supabase/client';
import { Users, ShieldCheck, Search, Loader2, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import type { UserRole } from '../../../../lib/db/types';

interface UserRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  email?: string;
}

interface RoleRow {
  user_id: string;
  masjid_id: string;
  role: UserRole;
  masjids: { name: string } | null;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'jamaah', label: 'Jama\'ah' },
  { value: 'pengurus', label: 'Pengurus' },
  { value: 'bendahara', label: 'Bendahara' },
  { value: 'ketua_dkm', label: 'Ketua DKM' },
  { value: 'super_admin', label: 'Super Admin' },
];

interface UserTableRowProps {
  readonly user: UserRow;
  readonly roleRow: RoleRow | undefined;
  readonly isUpdating: boolean;
  readonly masjids: { id: string; name: string }[];
  readonly handleAssignMasjid: (userId: string, masjidId: string) => Promise<void>;
  readonly handleRoleChange: (userId: string, masjidId: string, newRole: UserRole) => Promise<void>;
}

function getRoleBadgeClass(role: UserRole): string {
  switch (role) {
    case 'super_admin': return 'bg-purple-100 text-purple-700';
    case 'ketua_dkm': return 'bg-blue-100 text-blue-700';
    case 'bendahara': return 'bg-amber-100 text-amber-700';
    case 'pengurus': return 'bg-primary/10 text-primary';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function getRoleLabel(role: UserRole): string {
  return ROLE_OPTIONS.find(r => r.value === role)?.label ?? role;
}

function UserProfileCell({ user }: { readonly user: UserRow }) {
  return (
    <td className="px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
          {(user.full_name ?? 'U').charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-slate-dark">{user.full_name ?? '—'}</p>
          <p className="text-xs text-slate-light">{user.phone ?? '—'}</p>
        </div>
      </div>
    </td>
  );
}

interface UserMasjidCellProps {
  readonly user: UserRow;
  readonly roleRow: RoleRow | undefined;
  readonly isUpdating: boolean;
  readonly masjids: readonly { id: string; name: string }[];
  readonly handleAssignMasjid: (userId: string, masjidId: string) => Promise<void>;
}

function UserMasjidCell({
  user,
  roleRow,
  isUpdating,
  masjids,
  handleAssignMasjid
}: UserMasjidCellProps) {
  if (roleRow) {
    return (
      <td className="px-6 py-4">
        <span className="font-medium text-slate-dark">{roleRow.masjids?.name ?? '—'}</span>
      </td>
    );
  }

  return (
    <td className="px-6 py-4">
      <div className="flex items-center gap-2">
        <select
          defaultValue=""
          onChange={e => handleAssignMasjid(user.id, e.target.value)}
          className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary bg-white text-slate-dark"
          disabled={isUpdating}
        >
          <option value="" disabled>Pilih masjid...</option>
          {masjids.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>
    </td>
  );
}

function UserRoleCell({ roleRow }: { readonly roleRow: RoleRow | undefined }) {
  return (
    <td className="px-6 py-4">
      {roleRow ? (
        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeClass(roleRow.role)}`}>
          {getRoleLabel(roleRow.role)}
        </span>
      ) : (
        <span className="text-xs text-slate-light italic">Belum ditetapkan</span>
      )}
    </td>
  );
}

interface UserActionCellProps {
  readonly user: UserRow;
  readonly roleRow: RoleRow | undefined;
  readonly isUpdating: boolean;
  readonly handleRoleChange: (userId: string, masjidId: string, newRole: UserRole) => Promise<void>;
}

function UserActionCell({
  user,
  roleRow,
  isUpdating,
  handleRoleChange
}: UserActionCellProps) {
  if (!roleRow) {
    return <td className="px-6 py-4" />;
  }

  return (
    <td className="px-6 py-4">
      <div className="relative inline-flex items-center gap-1">
        <select
          value={roleRow.role}
          onChange={e => handleRoleChange(user.id, roleRow.masjid_id, e.target.value as UserRole)}
          disabled={isUpdating}
          className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary bg-white text-slate-dark disabled:opacity-50 appearance-none pr-7"
        >
          {ROLE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {isUpdating
          ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary absolute right-2 top-1/2 -translate-y-1/2" />
          : <ChevronDown className="w-3.5 h-3.5 text-slate-light absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        }
      </div>
    </td>
  );
}

function UserTableRow({
  user,
  roleRow,
  isUpdating,
  masjids,
  handleAssignMasjid,
  handleRoleChange
}: Readonly<UserTableRowProps>) {
  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-slate-50 transition-colors">
      <UserProfileCell user={user} />
      <UserMasjidCell
        user={user}
        roleRow={roleRow}
        isUpdating={isUpdating}
        masjids={masjids}
        handleAssignMasjid={handleAssignMasjid}
      />
      <UserRoleCell roleRow={roleRow} />
      <UserActionCell
        user={user}
        roleRow={roleRow}
        isUpdating={isUpdating}
        handleRoleChange={handleRoleChange}
      />
    </tr>
  );
}


export default function AdminUsersPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [masjids, setMasjids] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [usersRes, rolesRes, masjidsRes] = await Promise.all([
      supabase.from('users').select('id, full_name, phone, created_at').order('created_at', { ascending: false }),
      supabase.from('user_masjid_roles').select('user_id, masjid_id, role, masjids(name)'),
      supabase.from('masjids').select('id, name').order('name'),
    ]);
    setUsers(usersRes.data ?? []);
    const mappedRoles = (rolesRes.data ?? []).map((r: any) => ({
      user_id: r.user_id,
      masjid_id: r.masjid_id,
      role: r.role,
      masjids: Array.isArray(r.masjids) ? r.masjids[0] || null : r.masjids || null,
    }));
    setRoles(mappedRoles as RoleRow[]);
    setMasjids(masjidsRes.data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getUserRole = (userId: string): RoleRow | undefined =>
    roles.find(r => r.user_id === userId);

  const handleRoleChange = async (userId: string, masjidId: string, newRole: UserRole) => {
    setUpdatingId(userId);
    setMessage(null);
    const { error } = await supabase.from('user_masjid_roles').upsert(
      { user_id: userId, masjid_id: masjidId, role: newRole },
      { onConflict: 'user_id,masjid_id' }
    );
    if (error) {
      setMessage({ type: 'error', text: `Gagal memperbarui role: ${error.message}` });
    } else {
      setMessage({ type: 'success', text: 'Role berhasil diperbarui.' });
      await fetchData();
    }
    setUpdatingId(null);
  };

  const handleAssignMasjid = async (userId: string, masjidId: string) => {
    if (!masjidId) return;
    setUpdatingId(userId);
    setMessage(null);
    const { error } = await supabase.from('user_masjid_roles').upsert(
      { user_id: userId, masjid_id: masjidId, role: 'jamaah' },
      { onConflict: 'user_id,masjid_id' }
    );
    if (error) {
      setMessage({ type: 'error', text: `Gagal menetapkan masjid: ${error.message}` });
    } else {
      setMessage({ type: 'success', text: 'Pengguna berhasil ditetapkan ke masjid.' });
      await fetchData();
    }
    setUpdatingId(null);
  };

  const filtered = users.filter(u =>
    (u.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (u.phone ?? '').includes(search)
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-dark mb-1 flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-primary" />
          Kelola Pengguna & Role
        </h1>
        <p className="text-slate-light">Tetapkan role Pengurus, Bendahara, atau Ketua DKM untuk setiap jama'ah.</p>
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

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-light" />
        <input
          type="text"
          placeholder="Cari nama atau nomor telepon..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm text-slate-dark placeholder-slate-light focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-light">
            <Users className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">Tidak ada pengguna ditemukan</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-slate-50">
                <th className="text-left px-6 py-4 font-semibold text-slate-light text-xs uppercase tracking-wider">Pengguna</th>
                <th className="text-left px-6 py-4 font-semibold text-slate-light text-xs uppercase tracking-wider">Masjid</th>
                <th className="text-left px-6 py-4 font-semibold text-slate-light text-xs uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-4 font-semibold text-slate-light text-xs uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <UserTableRow
                  key={user.id}
                  user={user}
                  roleRow={getUserRole(user.id)}
                  isUpdating={updatingId === user.id}
                  masjids={masjids}
                  handleAssignMasjid={handleAssignMasjid}
                  handleRoleChange={handleRoleChange}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
