'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminShell from '../AdminShell';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_superadmin: boolean;
  is_in_study: boolean;
  is_matrix_admin: boolean;
  created_datetime_utc: string;
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

export default function UsersPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      const { data: profile } = await supabase.from('profiles').select('is_superadmin').eq('id', session.user.id).single();
      if (!profile?.is_superadmin) { setAccessDenied(true); setLoading(false); return; }
      fetchProfiles();
    };
    init();
  }, [router]);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_datetime_utc', { ascending: false });
    setProfiles(data || []);
    setLoading(false);
  };

  const filtered = profiles.filter(p =>
    `${p.first_name} ${p.last_name} ${p.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const Badge = ({ label, active, color }: { label: string; active: boolean; color: string }) => (
    <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: 3, background: active ? `${color}22` : '#1a1a1a', color: active ? color : '#444', border: `1px solid ${active ? color + '44' : '#2a2a2a'}` }}>
      {label}
    </span>
  );

  if (accessDenied) return <AccessDenied />;

  return (
    <AdminShell active="users">
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>Users</h1>
          <p style={{ fontSize: '0.78rem', color: '#555' }}>{profiles.length} profiles in database</p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="search users..."
          style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 6, padding: '0.5rem 0.75rem', color: '#e0e0e0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', width: 220 }}
        />
      </div>

      {loading ? (
        <div style={{ color: '#555', fontSize: '0.82rem' }}>Loading users...</div>
      ) : (
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ background: '#0d0d0d' }}>
                {['Name', 'Email', 'Roles', 'Joined'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#ccc' }}>
                    {p.first_name || p.last_name ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() : <span style={{ color: '#444' }}>—</span>}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#888' }}>{p.email || '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <Badge label="superadmin" active={p.is_superadmin} color="#febc2e" />
                      <Badge label="study" active={p.is_in_study} color="#60a5fa" />
                      <Badge label="matrix" active={p.is_matrix_admin} color="#f472b6" />
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.72rem', color: '#555' }}>
                    {p.created_datetime_utc ? new Date(p.created_datetime_utc).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#444', fontSize: '0.82rem' }}>No users found</div>
          )}
        </div>
      )}
    </AdminShell>
  );
}