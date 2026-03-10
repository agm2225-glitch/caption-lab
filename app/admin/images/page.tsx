'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminShell from '../AdminShell';

interface Caption {
  id: string;
  content: string;
  is_public: boolean;
  is_featured: boolean;
  like_count: number;
  created_datetime_utc: string;
  images: { url: string; image_description: string } | null;
}

const AccessDenied = () => {
  const router = useRouter();
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'IBM Plex Mono', monospace", color: '#e0e0e0' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⛔</div>
        <h1 style={{ color: '#f87171', marginBottom: '0.5rem', fontSize: '1.2rem' }}>Access Denied</h1>
        <p style={{ color: '#555', fontSize: '0.82rem', marginBottom: '1.5rem' }}>Your account does not have superadmin privileges.</p>
        <button onClick={() => { supabase.auth.signOut(); router.push('/'); }} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#888', padding: '0.5rem 1rem', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', cursor: 'pointer' }}>
          $ sign_out
        </button>
      </div>
    </div>
  );
};

export default function CaptionsPage() {
  const router = useRouter();
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      const { data: profile } = await supabase.from('profiles').select('is_superadmin').eq('id', session.user.id).single();
      if (!profile?.is_superadmin) { setAccessDenied(true); setLoading(false); return; }
      fetchCaptions();
    };
    init();
  }, [router]);

  const fetchCaptions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('captions')
      .select('id, content, is_public, is_featured, like_count, created_datetime_utc, images(url, image_description)')
      .order('created_datetime_utc', { ascending: false });
    setCaptions((data as unknown as Caption[]) || []);
    setLoading(false);
  };

  const filtered = captions.filter(c =>
    c.content?.toLowerCase().includes(search.toLowerCase())
  );

  if (accessDenied) return <AccessDenied />;

  return (
    <AdminShell active="captions">
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>Captions</h1>
          <p style={{ fontSize: '0.78rem', color: '#555' }}>{captions.length} captions · READ only</p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="search captions..."
          style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 6, padding: '0.5rem 0.75rem', color: '#e0e0e0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', width: 240 }}
        />
      </div>

      {loading ? (
        <div style={{ color: '#555', fontSize: '0.82rem' }}>Loading captions...</div>
      ) : (
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ background: '#0d0d0d' }}>
                {['Image', 'Caption', 'Flags', 'Likes', 'Created'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {c.images?.url
                      ? <img src={c.images.url} alt="" style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 3, border: '1px solid #2a2a2a' }} />
                      : <div style={{ width: 48, height: 36, background: '#1a1a1a', borderRadius: 3 }} />}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#aaa', maxWidth: 320 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>"{c.content}"</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {c.is_public && <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', background: '#4ade8022', color: '#4ade80', borderRadius: 3, border: '1px solid #4ade8044' }}>public</span>}
                      {c.is_featured && <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', background: '#febc2e22', color: '#febc2e', borderRadius: 3, border: '1px solid #febc2e44' }}>featured</span>}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#f472b6', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {c.like_count ?? 0}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.72rem', color: '#555' }}>
                    {c.created_datetime_utc ? new Date(c.created_datetime_utc).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: '#444', fontSize: '0.82rem' }}>No captions found</div>}
        </div>
      )}
    </AdminShell>
  );
}