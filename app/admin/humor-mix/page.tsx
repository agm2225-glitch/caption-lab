'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminShell from '../AdminShell';

interface ChainMixItem {
  slug: string;
  count: number;
  description: string;
}

const AccessDenied = () => {
  const router = useRouter();
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'IBM Plex Mono', monospace", color: '#e0e0e0' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⛔</div>
        <h1 style={{ color: '#f87171', marginBottom: '0.5rem', fontSize: '1.2rem' }}>Access Denied</h1>
        <p style={{ color: '#555', fontSize: '0.82rem', marginBottom: '1.5rem' }}>Superadmin required.</p>
        <button onClick={() => { supabase.auth.signOut(); router.push('/'); }} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#888', padding: '0.5rem 1rem', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', cursor: 'pointer' }}>
          $ sign_out
        </button>
      </div>
    </div>
  );
};

export default function PromptChainMixPage() {
  const router = useRouter();
  const [mix, setMix] = useState<ChainMixItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      const { data: profile } = await supabase.from('profiles').select('is_superadmin').eq('id', session.user.id).single();
      if (!profile?.is_superadmin) { setAccessDenied(true); setLoading(false); return; }
      fetchMix();
    };
    init();
  }, [router]);

  const fetchMix = async () => {
    setLoading(true);
    const [{ data: rawCaptions }, { data: definedChains }] = await Promise.all([
      supabase.from('captions').select('flavor'),
      supabase.from('humor_flavors').select('slug, description'),
    ]);

    const counts: Record<string, number> = {};
    (rawCaptions || []).forEach(c => {
      const key = c.flavor || 'default';
      counts[key] = (counts[key] || 0) + 1;
    });

    const mixList = Object.entries(counts).map(([slug, count]) => {
      const match = (definedChains || []).find(f => f.slug === slug);
      return {
        slug,
        count,
        description: match?.description || `${slug} prompt chain strategy`,
      };
    });

    setMix(mixList);
    setLoading(false);
  };

  if (accessDenied) return <AccessDenied />;

  const total = mix.reduce((sum, item) => sum + item.count, 0);

  return (
    <AdminShell active="prompt-chain-mix">
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>Prompt Chain Mix</h1>
          <p style={{ fontSize: '0.78rem', color: '#555' }}>Active distribution of generated prompt chains</p>
        </div>
        <button onClick={fetchMix} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#888', padding: '0.5rem 1rem', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', cursor: 'pointer' }}>
          ↻ refresh
        </button>
      </div>

      {loading ? (
        <div style={{ color: '#555', fontSize: '0.82rem' }}>Loading prompt chain mix...</div>
      ) : (
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: '1.25rem' }}>
          {mix.map(item => {
            const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
            return (
              <div key={item.slug} style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ color: '#4ade80', fontSize: '0.85rem', fontFamily: "'IBM Plex Mono', monospace" }}>{item.slug}</span>
                  <span style={{ color: '#888', fontSize: '0.78rem', fontFamily: "'IBM Plex Mono', monospace" }}>{item.count} captions ({pct}%)</span>
                </div>
                <div style={{ height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: '#60a5fa', borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
          {mix.length === 0 && <div style={{ color: '#444', fontSize: '0.82rem', textAlign: 'center', padding: '1rem' }}>No active mix data available</div>}
        </div>
      )}
    </AdminShell>
  );
}