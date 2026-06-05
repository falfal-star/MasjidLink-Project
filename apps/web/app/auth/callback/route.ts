import { NextResponse } from 'next/server';
import { createClient } from '../../../utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard/jamaah';

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user) {
      // Sync user metadata ke tabel public.users
      await supabase.from('users').upsert({
        id: data.user.id,
        full_name: data.user.user_metadata?.full_name ?? null,
        avatar_url: data.user.user_metadata?.avatar_url ?? null,
        phone: data.user.user_metadata?.phone ?? null,
        address: data.user.user_metadata?.address ?? null,
      }, { onConflict: 'id' });

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Autentikasi gagal`);
}
