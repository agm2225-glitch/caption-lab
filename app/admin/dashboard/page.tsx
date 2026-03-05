'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminShell from '../AdminShell';

interface FunniestCaption {
  caption_id: string;
  content: string;
  image_url: string;
  image_description: string;
  total_votes: number;
  upvotes: number;
  downvotes: number;
}

interface Stats {
  totalUsers: number;
  totalImages: number;
  totalCaptions: number;
  totalVotes: number;
  funniest: FunniestCaption[];
}

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_superadmin')
        .eq('id', session.user.id)
        .single();

      if (!profile?.is_superadmin) { router.push('/'); return; }

      await fetchStats();
    };
    init();
  }, [router]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [
        { count: userCount },
        { count: imageCount },
        { count: captionCount },
        { data: votes },
        { data: captionData },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('images').select('*', { count: 'exact', head: true }),
        supabase.from('captions').select('*', { count: 'exact', head: true }),
        supabase.from('caption_votes').select('caption_id, vote_value'),
        supabase.from('captions').select('id, content, image_id, images(id, url, image_description)').eq('is_public', true),
      ]);

      // Aggregate votes per caption
      const voteMap: Record<string, { up: number; down: number }> = {};
      votes?.forEach(v => {
        if (!voteMap[v.caption_id]) voteMap[v.caption_id] = { up: 0, down: 0 };
        if (v.vote_value > 0) voteMap[v.caption_id].up += v.vote_value;
        else voteMap[v.caption_id].down += Math.abs(v.vote_value);
      });

      // Build funniest list (net score = upvotes - downvotes)
      const funniest: FunniestCaption[] = (captionData || [])
        .map((c: any) => {
          const v = voteMap[c.id] || { up: 0, down: 0 };
          return {
            caption_id: c.id,
            content: c.content,
            image_url: c.images?.url ?? '',
            image_description: c.images?.image_description ?? '',
            total_votes: v.up + v.down,
            upvotes: v.up,
            downvotes: v.down,
          };
        })
        .sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes))
        .slice(0, 5);

      setStats({
        totalUsers: userCount ?? 0,
        totalImages: imageCount ?? 0,
        totalCaptions: captionCount ?? 0,
        totalVotes: votes?.length ?? 0,
        funniest,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <AdminShell active="dashboard">
      <div style={{ color: '#555', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.82rem' }}>Loading stats...</div>
    </AdminShell>
  );

  return (
    <AdminShell active="dashboard">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>Dashboard</h1>
        <p style={{ fontSize: '0.78rem', color: '#555' }}>System overview and funniest caption leaderboard</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'Users', value: stats?.totalUsers, color: '#4ade80' },
          { label: 'Images', value: stats?.totalImages, color: '#60a5fa' },
          { label: 'Captions', value: stats?.totalCaptions, color: '#f472b6' },
          { label: 'Votes Cast', value: stats?.totalVotes, color: '#febc2e' },
        ].map(s => (
          <div key={s.label} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: '1.25rem' }}>
            <div style={{ fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', fontFamily: "'IBM Plex Mono', monospace" }}>{s.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 600, color: s.color, fontFamily: "'IBM Plex Mono', monospace" }}>{s.value?.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Funniest captions leaderboard */}
      <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#febc2e', fontSize: '0.82rem', fontFamily: "'IBM Plex Mono', monospace" }}>★</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#e0e0e0', fontFamily: "'IBM Plex Mono', monospace" }}>Funniest Caption/Image Combos</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#555' }}>ranked by net score (↑ − ↓)</span>
        </div>
        {stats?.funniest.map((item, idx) => (
          <div key={item.caption_id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', borderBottom: idx < 4 ? '1px solid #1a1a1a' : 'none' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: idx === 0 ? '#febc2e' : '#333', fontFamily: "'IBM Plex Mono', monospace", width: 24, textAlign: 'center', flexShrink: 0 }}>
              {idx + 1}
            </div>
            {item.image_url && (
              <img src={item.image_url} alt={item.image_description} style={{ width: 56, height: 42, objectFit: 'cover', borderRadius: 4, flexShrink: 0, border: '1px solid #2a2a2a' }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.82rem', color: '#ccc', fontStyle: 'italic', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{item.content}"</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
              <span style={{ fontSize: '0.75rem', color: '#4ade80', fontFamily: "'IBM Plex Mono', monospace" }}>↑{item.upvotes}</span>
              <span style={{ fontSize: '0.75rem', color: '#f87171', fontFamily: "'IBM Plex Mono', monospace" }}>↓{item.downvotes}</span>
              <span style={{ fontSize: '0.75rem', color: '#febc2e', fontFamily: "'IBM Plex Mono', monospace", minWidth: 40, textAlign: 'right' }}>
                net {item.upvotes - item.downvotes >= 0 ? '+' : ''}{item.upvotes - item.downvotes}
              </span>
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}