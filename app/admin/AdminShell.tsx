'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const NAV = [
  { key: 'dashboard', label: '~/dashboard', href: '/admin/dashboard' },
  { key: 'users', label: '~/users', href: '/admin/users' },
  { key: 'images', label: '~/images', href: '/admin/images' },
  { key: 'captions', label: '~/captions', href: '/admin/captions' },
];

export default function AdminShell({ children, active }: { children: React.ReactNode; active: string }) {
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; }
        .nav-item { transition: all 0.15s; }
        .nav-item:hover { background: #1a1a1a !important; color: #fff !important; }
        .nav-item.active { background: #1a1a1a !important; color: #4ade80 !important; border-left: 2px solid #4ade80 !important; }
        .action-btn { transition: all 0.15s; cursor: pointer; }
        .action-btn:hover { opacity: 0.8; }
        .delete-btn:hover { background: #7f1d1d !important; border-color: #ef4444 !important; color: #ef4444 !important; }
        input, textarea { transition: border-color 0.15s; }
        input:focus, textarea:focus { outline: none; border-color: #4ade80 !important; }
        table { border-collapse: collapse; width: 100%; }
        tr { border-bottom: 1px solid #1a1a1a; transition: background 0.1s; }
        tr:hover { background: #0f0f0f; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.3s ease both; }
      `}</style>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a', fontFamily: "'IBM Plex Mono', monospace", color: '#e0e0e0' }}>

        {/* Sidebar */}
        <aside style={{ width: 220, background: '#0d0d0d', borderRight: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #1a1a1a' }}>
            <div style={{ fontSize: '0.7rem', color: '#555', marginBottom: '0.2rem' }}>ADMIN PANEL</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>Kinda<span style={{ color: '#4ade80' }}>Crackd</span></div>
          </div>

          <nav style={{ flex: 1, padding: '0.75rem 0' }}>
            {NAV.map(item => (
              <a
                key={item.key}
                href={item.href}
                className={`nav-item${active === item.key ? ' active' : ''}`}
                style={{ display: 'block', padding: '0.6rem 1rem', fontSize: '0.78rem', color: '#555', textDecoration: 'none', borderLeft: '2px solid transparent' }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div style={{ padding: '1rem', borderTop: '1px solid #1a1a1a' }}>
            <button
              onClick={handleSignOut}
              style={{ width: '100%', background: 'transparent', border: '1px solid #2a2a2a', color: '#555', padding: '0.5rem', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', cursor: 'pointer' }}
            >
              $ sign_out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </>
  );
}