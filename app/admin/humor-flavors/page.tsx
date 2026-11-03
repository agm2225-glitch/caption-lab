'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminShell from '../AdminShell';

interface PromptChain {
  id: number;
  slug: string;
  description: string | null;
  created_at?: string;
  created_datetime_utc?: string;
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

export default function PromptChainsPage() {
  const router = useRouter();
  const [chains, setChains] = useState<PromptChain[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      const { data: profile } = await supabase.from('profiles').select('is_superadmin').eq('id', session.user.id).single();
      if (!profile?.is_superadmin) { setAccessDenied(true); setLoading(false); return; }
      fetchChains();
    };
    init();
  }, [router]);

  const fetchChains = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('humor_flavors')
      .select('*')
      .order('id', { ascending: true });

    if (error) console.error('Fetch prompt chains error:', error.message);
    setChains(data || []);
    setLoading(false);
  };

  const filtered = chains.filter(c =>
    c.slug?.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (accessDenied) return <AccessDenied />;

  return (
    <AdminShell active="prompt-chains">
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>Prompt Chains</h1>
          <p style={{ fontSize: '0.78rem', color: '#555' }}>{chains.length} prompt chains · READ only</p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="search chains..."
          style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 6, padding: '0.5rem 0.75rem', color: '#e0e0e0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', width: 240 }}
        />
      </div>

      {loading ? (
        <div style={{ color: '#555', fontSize: '0.82rem' }}>Loading prompt chains...</div>
      ) : (
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ background: '#0d0d0d' }}>
                {['ID', 'Slug / Name', 'Description', 'Created'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#febc2e', fontFamily: "'IBM Plex Mono', monospace" }}>{c.id}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#4ade80', fontWeight: 500, fontFamily: "'IBM Plex Mono', monospace" }}>{c.slug}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#aaa' }}>{c.description || '—'}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.72rem', color: '#555' }}>
                    {c.created_datetime_utc || c.created_at ? new Date(c.created_datetime_utc || c.created_at!).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: '#444', fontSize: '0.82rem' }}>No prompt chains found</div>}
        </div>
      )}
    </AdminShell>
  );
}