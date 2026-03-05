'use client';

import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default function RootPage() {
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e0e0e0', fontFamily: 'monospace' }}>
      <div>
        <h1 style={{ color: '#fff', marginBottom: '1rem' }}>KindaCrackd Admin</h1>
        <button onClick={handleLogin} style={{ background: '#1a1a1a', color: '#e0e0e0', border: '1px solid #3a3a3a', padding: '0.75rem 1.5rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
          Sign in with Google
        </button>
      </div>
    </main>
  );
}