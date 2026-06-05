-- ============================================================
-- MasjidLink - Database Schema
-- Jalankan SQL ini di: Supabase → SQL Editor → New Query
-- ============================================================

-- 1. Users (sync metadata dari Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Masjids (tenant utama, multi-tenancy)
CREATE TABLE IF NOT EXISTS public.masjids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  province TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User-Masjid Roles (role per masjid per user)
CREATE TABLE IF NOT EXISTS public.user_masjid_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  masjid_id UUID REFERENCES public.masjids(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'jamaah',
  -- role: 'jamaah' | 'pengurus' | 'ketua_dkm' | 'bendahara' | 'super_admin'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, masjid_id)
);

-- 4. Programs (proposal & program kerja masjid)
CREATE TABLE IF NOT EXISTS public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  masjid_id UUID REFERENCES public.masjids(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id),
  title TEXT NOT NULL,
  description TEXT,
  budget NUMERIC(15,2),
  status TEXT NOT NULL DEFAULT 'draft',
  -- status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'completed'
  start_date DATE,
  end_date DATE,
  execution_progress INT DEFAULT 0,
  attendance_count INT DEFAULT 0,
  lpj_text TEXT,
  lpj_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Transactions (keuangan ZISWAF — immutable/append-only)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  masjid_id UUID REFERENCES public.masjids(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id),
  type TEXT NOT NULL,
  -- type: 'zakat' | 'infaq' | 'shodaqoh' | 'wakaf' | 'hibah' | 'pengeluaran'
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  recorded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Donations (donasi manual dengan kode unik)
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  masjid_id UUID REFERENCES public.masjids(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id),
  donor_id UUID REFERENCES public.users(id),
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  unique_code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  -- status: 'pending' | 'confirmed' | 'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row-Level Security (RLS) & Helper Functions
-- ============================================================

-- Helper: Check if user is a Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_masjid_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: Check if user is staff (pengurus/bendahara/ketua_dkm/super_admin) of a specific masjid
CREATE OR REPLACE FUNCTION public.is_masjid_staff(target_masjid_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_masjid_roles
    WHERE user_id = auth.uid()
      AND masjid_id = target_masjid_id
      AND role IN ('pengurus', 'ketua_dkm', 'bendahara', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aktifkan RLS pada semua tabel
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.masjids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_masjid_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- 1. Users policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles" ON public.users
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "Staff can view users in same masjid" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_masjid_roles staff
      WHERE staff.user_id = auth.uid()
        AND staff.role IN ('pengurus', 'ketua_dkm', 'bendahara')
        AND EXISTS (
          SELECT 1 FROM public.user_masjid_roles member
          WHERE member.user_id = public.users.id
            AND member.masjid_id = staff.masjid_id
        )
    )
  );

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Super admins can update any profile" ON public.users
  FOR UPDATE USING (public.is_super_admin());

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Super admins can insert profiles" ON public.users
  FOR INSERT WITH CHECK (public.is_super_admin());

-- 2. Masjids policies
CREATE POLICY "Authenticated users can view masjids" ON public.masjids
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Super admins can insert masjids" ON public.masjids
  FOR INSERT WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update masjids" ON public.masjids
  FOR UPDATE USING (public.is_super_admin());

CREATE POLICY "Super admins can delete masjids" ON public.masjids
  FOR DELETE USING (public.is_super_admin());

-- 3. User Masjid Roles policies
CREATE POLICY "Users can view own roles" ON public.user_masjid_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all roles" ON public.user_masjid_roles
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "Staff can view roles in same masjid" ON public.user_masjid_roles
  FOR SELECT USING (
    masjid_id IN (
      SELECT masjid_id FROM public.user_masjid_roles
      WHERE user_id = auth.uid() AND role IN ('pengurus', 'ketua_dkm', 'bendahara')
    )
  );

CREATE POLICY "Super admins can manage roles" ON public.user_masjid_roles
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "Ketua DKM can manage roles in same masjid" ON public.user_masjid_roles
  FOR ALL USING (
    masjid_id IN (
      SELECT masjid_id FROM public.user_masjid_roles
      WHERE user_id = auth.uid() AND role = 'ketua_dkm'
    )
  );

CREATE POLICY "Users can manage own jamaah role" ON public.user_masjid_roles
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND role = 'jamaah')
  WITH CHECK (auth.uid() = user_id AND role = 'jamaah');

-- 4. Programs policies
CREATE POLICY "Members can view their masjid programs" ON public.programs
  FOR SELECT USING (
    public.is_super_admin() OR
    masjid_id IN (
      SELECT masjid_id FROM public.user_masjid_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can insert programs" ON public.programs
  FOR INSERT WITH CHECK (
    public.is_super_admin() OR
    (masjid_id IN (
      SELECT masjid_id FROM public.user_masjid_roles
      WHERE user_id = auth.uid() AND role IN ('pengurus', 'ketua_dkm', 'bendahara')
    ) AND (created_by = auth.uid() OR created_by IS NULL))
  );

CREATE POLICY "Staff can update programs" ON public.programs
  FOR UPDATE USING (
    public.is_super_admin() OR
    masjid_id IN (
      SELECT masjid_id FROM public.user_masjid_roles
      WHERE user_id = auth.uid() AND role IN ('pengurus', 'ketua_dkm', 'bendahara')
    )
  );

CREATE POLICY "Staff can delete programs" ON public.programs
  FOR DELETE USING (
    public.is_super_admin() OR
    masjid_id IN (
      SELECT masjid_id FROM public.user_masjid_roles
      WHERE user_id = auth.uid() AND role IN ('pengurus', 'ketua_dkm')
    )
  );

-- 5. Transactions policies
CREATE POLICY "Members can view their masjid transactions" ON public.transactions
  FOR SELECT USING (
    public.is_super_admin() OR
    masjid_id IN (
      SELECT masjid_id FROM public.user_masjid_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    public.is_super_admin() OR
    (masjid_id IN (
      SELECT masjid_id FROM public.user_masjid_roles
      WHERE user_id = auth.uid() AND role IN ('bendahara', 'ketua_dkm', 'pengurus', 'super_admin')
    ) AND (recorded_by = auth.uid() OR recorded_by IS NULL))
  );

CREATE POLICY "Staff can update transactions" ON public.transactions
  FOR UPDATE USING (
    public.is_super_admin() OR
    masjid_id IN (
      SELECT masjid_id FROM public.user_masjid_roles
      WHERE user_id = auth.uid() AND role IN ('bendahara', 'ketua_dkm', 'super_admin')
    )
  );

-- 6. Donations policies
CREATE POLICY "Donors can view own donations" ON public.donations
  FOR SELECT USING (auth.uid() = donor_id);

CREATE POLICY "Super admins can view all donations" ON public.donations
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "Staff can view donations in same masjid" ON public.donations
  FOR SELECT USING (
    masjid_id IN (
      SELECT masjid_id FROM public.user_masjid_roles
      WHERE user_id = auth.uid() AND role IN ('pengurus', 'ketua_dkm', 'bendahara', 'super_admin')
    )
  );

CREATE POLICY "Authenticated users can insert donations" ON public.donations
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND (donor_id = auth.uid() OR donor_id IS NULL)
  );

CREATE POLICY "Staff can update donations" ON public.donations
  FOR UPDATE USING (
    public.is_super_admin() OR
    masjid_id IN (
      SELECT masjid_id FROM public.user_masjid_roles
      WHERE user_id = auth.uid() AND role IN ('pengurus', 'ketua_dkm', 'bendahara', 'super_admin')
    )
  );

-- ============================================================
-- Trigger: Auto-insert ke public.users saat user baru daftar
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
