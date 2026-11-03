'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const NAV_GROUPS = [
  {
    label: 'CORE',
    items: [
      { key: 'dashboard', label: '~/dashboard', href: '/admin/dashboard' },
      { key: 'users', label: '~/users', href: '/admin/users' },
    ],
  },
  {
    label: 'CONTENT',
    items: [
      { key: 'images', label: '~/images', href: '/admin/images' },
      { key: 'captions', label: '~/captions', href: '/admin/captions' },
      { key: 'caption-requests', label: '~/caption-requests', href: '/admin/caption-requests' },
      { key: 'caption-examples', label: '~/caption-examples', href: '/admin/caption-examples' },
      { key: 'terms', label: '~/terms', href: '/admin/terms' },
    ],
  },
  {
    label: 'HUMOR',
    items: [
      { key: 'humor-flavors', label: '~/prompt-chains', href: '/admin/humor-flavors' },
      { key: 'humor-flavor-steps', label: '~/prompt-chain-steps', href: '/admin/humor-flavor-steps' },
      { key: 'humor-mix', label: '~/prompt-chain-mix', href: '/admin/humor-mix' },
    ],
  },
  {
    label: 'LLM',
    items: [
      { key: 'llm-providers', label: '~/llm-providers', href: '/admin/llm-providers' },
      { key: 'llm-models', label: '~/llm-models', href: '/admin/llm-models' },
      { key: 'llm-responses', label: '~/llm-responses', href: '/admin/llm-responses' },
    ],
  },
  {
    label: 'ACCESS',
    items: [
      { key: 'allowed-domains', label: '~/allowed-domains', href: '/admin/allowed-domains' },
      { key: 'whitelisted-emails', label: '~/whitelisted-emails', href: '/admin/whitelisted-emails' },
    ],
  },
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
        input, textarea, select { transition: border-color 0.15s; }
        input:focus, textarea:focus, select:focus { outline: none; border-color: #4ade80 !important; }
        table { border-collapse: collapse; width: 100%; }
        tr:hover td { background: #0f0f0f; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.3s ease both; }
      `}</style>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a', fontFamily: "'IBM Plex Mono', monospace", color: '#e0e0e0' }}>

        {/* Sidebar */}
        <aside style={{ width: 220, background: '#0d0d0d', borderRight: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>
          <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #1a1a1a' }}>
            <div style={{ fontSize: '0.7rem', color: '#555', marginBottom: '0.2rem' }}>ADMIN PANEL</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>Control<span style={{ color: '#4ade80' }}>Lab</span></div>
          </div>

          <nav style={{ flex: 1, padding: '0.5rem 0' }}>
            {NAV_GROUPS.map(group => (
              <div key={group.label} style={{ marginBottom: '0.25rem' }}>
                <div style={{ padding: '0.5rem 1rem 0.25rem', fontSize: '0.6rem', color: '#333', letterSpacing: '0.12em' }}>{group.label}</div>
                {group.items.map(item => (
                  <a
                    key={item.key}
                    href={item.href}
                    className={`nav-item${active === item.key ? ' active' : ''}`}
                    style={{ display: 'block', padding: '0.45rem 1rem', fontSize: '0.72rem', color: '#555', textDecoration: 'none', borderLeft: '2px solid transparent' }}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
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