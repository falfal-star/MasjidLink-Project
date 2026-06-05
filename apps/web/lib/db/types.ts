// ============================================================
// MasjidLink - Database Types (Supabase)
// Semua tipe ini merepresentasikan tabel di Supabase.
// Tidak menggunakan Prisma — query via @supabase/supabase-js
// ============================================================

export type UserRole =
  | 'jamaah'
  | 'pengurus'
  | 'ketua_dkm'
  | 'bendahara'
  | 'super_admin';

export type ProgramStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'completed';

export type TransactionType =
  | 'zakat'
  | 'infaq'
  | 'shodaqoh'
  | 'wakaf'
  | 'hibah'
  | 'pengeluaran';

export type DonationStatus = 'pending' | 'confirmed' | 'rejected';

// ----- Tabel: users -----
export interface User {
  id: string; // UUID — sama dengan auth.users.id
  full_name: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  is_verified_donor: boolean | null;
  created_at: string;
}

// ----- Tabel: masjids -----
export interface Masjid {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  created_at: string;
}

// ----- Tabel: user_masjid_roles -----
export interface UserMasjidRole {
  id: string;
  user_id: string;
  masjid_id: string;
  role: UserRole;
  created_at: string;
}

// ----- Tabel: programs -----
export interface Program {
  id: string;
  masjid_id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  budget: number | null;
  status: ProgramStatus;
  start_date: string | null;
  end_date: string | null;
  execution_progress: number | null;
  attendance_count: number | null;
  lpj_text: string | null;
  lpj_published: boolean | null;
  created_at: string;
}

// ----- Tabel: transactions -----
export interface Transaction {
  id: string;
  masjid_id: string;
  program_id: string | null;
  type: TransactionType;
  amount: number;
  description: string | null;
  recorded_by: string | null;
  created_at: string;
}

// ----- Tabel: donations -----
export interface Donation {
  id: string;
  masjid_id: string;
  program_id: string | null;
  donor_id: string | null;
  amount: number;
  unique_code: string | null;
  status: DonationStatus;
  created_at: string;
}

// ----- Supabase Database type (untuk createClient<Database>) -----
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'created_at'> & { created_at?: string };
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      masjids: {
        Row: Masjid;
        Insert: Omit<Masjid, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Masjid, 'id' | 'created_at'>>;
      };
      user_masjid_roles: {
        Row: UserMasjidRole;
        Insert: Omit<UserMasjidRole, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<UserMasjidRole, 'id' | 'created_at'>>;
      };
      programs: {
        Row: Program;
        Insert: Omit<Program, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Program, 'id' | 'created_at'>>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Transaction, 'id' | 'created_at'>>;
      };
      donations: {
        Row: Donation;
        Insert: Omit<Donation, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Donation, 'id' | 'created_at'>>;
      };
      program_registrations: {
        Row: ProgramRegistration;
        Insert: Omit<ProgramRegistration, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<ProgramRegistration, 'id' | 'created_at'>>;
      };
    };
  };
}

export interface ProgramRegistration {
  id: string;
  user_id: string;
  program_id: string;
  created_at: string;
}
