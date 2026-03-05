'use client';
export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/admin/dashboard');
    });
  }, [router]);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .cursor { animation: blink 1s step-end infinite; }
        .signin-btn { transition: all 0.2s; }
        .signin-btn:hover { background: #fff !important; color: #0a0a0a !important; }
      `}</style>
      <main style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'IBM Plex Mono', monospace", color: '#e0e0e0' }}>
        <div style={{ maxWidth: 480, width: '100%', padding: '0 2rem' }}>

          {/* Terminal header */}
          <div style={{ border: '1px solid #2a2a2a', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ background: '#1a1a1a', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #2a2a2a' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
              <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', color: '#666' }}>admin@kindacrackd ~ </span>
            </div>

            <div style={{ padding: '2rem', background: '#0a0a0a' }}>
              <div style={{ marginBottom: '0.4rem', color: '#666', fontSize: '0.78rem' }}>$ ./authenticate.sh</div>
              <div style={{ marginBottom: '2rem' }}>
                <span style={{ color: '#4ade80', fontSize: '0.78rem' }}>▶ </span>
                <span style={{ fontSize: '0.78rem', color: '#aaa' }}>KindaCrackd Admin Panel</span>
                <span style={{ color: '#666', fontSize: '0.78rem' }}> v1.0.0</span>
              </div>

              <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                Access Required<span className="cursor" style={{ color: '#4ade80' }}>_</span>
              </h1>
              <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: '2rem', lineHeight: 1.6 }}>
                Superadmin credentials required.<br />Unauthorized access will be logged.
              </p>

              <button
                className="signin-btn"
                onClick={handleLogin}
                style={{ width: '100%', background: 'transparent', color: '#e0e0e0', border: '1px solid #3a3a3a', padding: '0.75rem', borderRadius: 6, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}
              >
                <span style={{ width: 16, height: 16, background: 'white', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#4285f4', flexShrink: 0 }}>G</span>
                $ sign_in --provider google
              </button>

              <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: '#111', borderRadius: 6, border: '1px solid #1e1e1e' }}>
                <div style={{ fontSize: '0.7rem', color: '#555', marginBottom: '0.3rem' }}>SYSTEM NOTE</div>
                <div style={{ fontSize: '0.72rem', color: '#555', lineHeight: 1.6 }}>
                  Only users with <span style={{ color: '#febc2e' }}>is_superadmin=TRUE</span> in profiles table will be granted access.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}