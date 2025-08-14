import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('Error exchanging code for session:', error);
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
}
