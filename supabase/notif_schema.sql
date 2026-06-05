-- ============================================================
-- MasjidLink - Notification Logs Table Schema (NOTF-01 to NOTF-03)
-- Run this SQL in: Supabase → SQL Editor → New Query → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'whatsapp' | 'push' | 'email'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent' | 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- 1. Users can view own notification logs
DROP POLICY IF EXISTS "Users can view own notification logs" ON public.notification_logs;
CREATE POLICY "Users can view own notification logs" ON public.notification_logs
  FOR SELECT USING (auth.uid() = user_id);

-- 2. Staff can view all notification logs for auditing
DROP POLICY IF EXISTS "Staff can view all notification logs" ON public.notification_logs;
CREATE POLICY "Staff can view all notification logs" ON public.notification_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_masjid_roles
      WHERE user_id = auth.uid() AND role IN ('pengurus', 'ketua_dkm', 'bendahara', 'super_admin')
    )
  );

-- 3. Authenticated users can insert notification logs (to log events)
DROP POLICY IF EXISTS "Authenticated users can insert notification logs" ON public.notification_logs;
CREATE POLICY "Authenticated users can insert notification logs" ON public.notification_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
