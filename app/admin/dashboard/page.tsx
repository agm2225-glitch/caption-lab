'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminShell from '../AdminShell';

interface CaptionStat {
  caption_id: string;
  content: string;
  image_url: string;
  image_description: string;
  upvotes: number;
  downvotes: number;
  net: number;
  total_votes: number;
  controversy_score: number;
  created_at?: string;
}

interface DailyVote {
  date: string;
  votes: number;
  upvotes: number;
  downvotes: number;
}

interface Stats {
  totalCaptions: number;
  totalVotes: number;
  totalUpvotes: number;
  totalDownvotes: number;
  avgVotesPerCaption: number;
  avgNetScore: number;
  positivityRate: number;
  captionsWithNoVotes: number;
  captionsWithVotes: number;
  topFunniest: CaptionStat[];
  mostControversial: CaptionStat[];
  mostVoted: CaptionStat[];
  worstRated: CaptionStat[];
  ratingDistribution: { label: string; count: number; color: string }[];
  dailyVotes: DailyVote[];
  topImages: { image_url: string; image_description: string; caption_count: number; avg_net: number }[];
}

const Pill = ({ children, color }: { children: React.ReactNode; color: string }) => (
  <span style={{
    display: 'inline-block', padding: '2px 8px', borderRadius: 99,
    fontSize: '0.68rem', fontFamily: "'IBM Plex Mono', monospace",
    background: color + '22', color, border: `1px solid ${color}44`,
  }}>{children}</span>
);

const Bar = ({ value, max, color }: { value: number; max: number; color: string }) => (
  <div style={{ height: 4, background: '#1e1e1e', borderRadius: 2, overflow: 'hidden', marginTop: 6 }}>
    <div style={{ height: '100%', width: `${Math.max(2, (value / max) * 100)}%`, background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
  </div>
);

const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div style={{ marginBottom: '1.25rem' }}>
    <h2 style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e0e0e0', fontFamily: "'IBM Plex Mono', monospace", margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{title}</h2>
    {subtitle && <p style={{ fontSize: '0.7rem', color: '#444', margin: '0.25rem 0 0', fontFamily: "'IBM Plex Mono', monospace" }}>{subtitle}</p>}
  </div>
);

const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, overflow: 'hidden', ...style }}>
    {children}
  </div>
);

const CaptionRow = ({ item, idx, scoreLabel, scoreColor, scoreValue }: {
  item: CaptionStat; idx: number; scoreLabel: string; scoreColor: string; scoreValue: string;
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.25rem', borderBottom: idx < 4 ? '1px solid #1a1a1a' : 'none' }}>
    <div style={{ fontSize: '1rem', fontWeight: 700, color: idx === 0 ? '#febc2e' : '#2a2a2a', fontFamily: "'IBM Plex Mono', monospace", width: 20, textAlign: 'center', flexShrink: 0 }}>{idx + 1}</div>
    {item.image_url && (
      <img src={item.image_url} alt="" style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 4, flexShrink: 0, border: '1px solid #2a2a2a' }} />
    )}
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: '0.78rem', color: '#ccc', fontStyle: 'italic', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'IBM Plex Mono', monospace' " }}>"{item.content}"</p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Pill color="#4ade80">↑{item.upvotes}</Pill>
        <Pill color="#f87171">↓{item.downvotes}</Pill>
        <Pill color="#555">{item.total_votes} votes</Pill>
      </div>
    </div>
    <div style={{ textAlign: 'right', flexShrink: 0 }}>
      <div style={{ fontSize: '0.7rem', color: '#444', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 2 }}>{scoreLabel}</div>
      <div style={{ fontSize: '1rem', fontWeight: 700, color: scoreColor, fontFamily: "'IBM Plex Mono', monospace" }}>{scoreValue}</div>
    </div>
  </div>
);

export default function CaptionStats() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'rankings' | 'images' | 'trends'>('overview');

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      const { data: profile } = await supabase.from('profiles').select('is_superadmin').eq('id', session.user.id).single();
      if (!profile?.is_superadmin) { router.push('/'); return; }
      await fetchStats();
    };
    init();
  }, [router]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [
        { data: votes },
        { data: captions },
        { data: images },
      ] = await Promise.all([
        supabase.from('caption_votes').select('caption_id, vote_value, created_at'),
        supabase.from('captions').select('id, content, image_id, is_public, created_at, images(id, url, image_description)').eq('is_public', true),
        supabase.from('images').select('id, url, image_description'),
      ]);

      // ── Vote aggregation ─────────────────────────────────────────────────
      const voteMap: Record<string, { up: number; down: number }> = {};
      let totalUp = 0, totalDown = 0;

      votes?.forEach(v => {
        if (!voteMap[v.caption_id]) voteMap[v.caption_id] = { up: 0, down: 0 };
        if (v.vote_value > 0) { voteMap[v.caption_id].up += v.vote_value; totalUp += v.vote_value; }
        else { voteMap[v.caption_id].down += Math.abs(v.vote_value); totalDown += Math.abs(v.vote_value); }
      });

      // ── Caption stats ────────────────────────────────────────────────────
      const captionStats: CaptionStat[] = (captions || []).map((c: any) => {
        const v = voteMap[c.id] || { up: 0, down: 0 };
        const total = v.up + v.down;
        const net = v.up - v.down;
        // Controversy: high when votes are split evenly and total is high
        const controversy = total > 0 ? (Math.min(v.up, v.down) / Math.max(v.up, v.down, 1)) * Math.log(total + 1) : 0;
        return {
          caption_id: c.id,
          content: c.content,
          image_url: c.images?.url ?? '',
          image_description: c.images?.image_description ?? '',
          upvotes: v.up,
          downvotes: v.down,
          net,
          total_votes: total,
          controversy_score: controversy,
          created_at: c.created_at,
        };
      });

      const withVotes = captionStats.filter(c => c.total_votes > 0);
      const noVotes = captionStats.filter(c => c.total_votes === 0).length;
      const avgNet = withVotes.length > 0 ? withVotes.reduce((a, b) => a + b.net, 0) / withVotes.length : 0;
      const avgVotes = captionStats.length > 0 ? (votes?.length ?? 0) / captionStats.length : 0;

      // ── Rating distribution ──────────────────────────────────────────────
      const buckets = [
        { label: 'Loved (net ≥ 10)', min: 10, max: Infinity, color: '#4ade80' },
        { label: 'Liked (net 1–9)', min: 1, max: 9, color: '#86efac' },
        { label: 'Mixed (net 0)', min: 0, max: 0, color: '#facc15' },
        { label: 'Disliked (net −1–−9)', min: -9, max: -1, color: '#fb923c' },
        { label: 'Hated (net ≤ −10)', min: -Infinity, max: -10, color: '#f87171' },
      ];
      const ratingDistribution = buckets.map(b => ({
        label: b.label,
        color: b.color,
        count: withVotes.filter(c => c.net >= b.min && c.net <= b.max).length,
      }));

      // ── Daily vote trends (last 14 days) ────────────────────────────────
      const last14: DailyVote[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayVotes = votes?.filter(v => v.created_at?.startsWith(dateStr)) ?? [];
        last14.push({
          date: dateStr,
          votes: dayVotes.length,
          upvotes: dayVotes.filter(v => v.vote_value > 0).length,
          downvotes: dayVotes.filter(v => v.vote_value < 0).length,
        });
      }

      // ── Top images by caption performance ───────────────────────────────
      const imageMap: Record<string, { url: string; desc: string; nets: number[]; count: number }> = {};
      captionStats.forEach(c => {
        const img = (captions || []).find((x: any) => x.id === c.caption_id)?.images;
        const imgId = (captions || []).find((x: any) => x.id === c.caption_id)?.image_id;
        if (!imgId) return;
        if (!imageMap[imgId]) imageMap[imgId] = { url: c.image_url, desc: c.image_description, nets: [], count: 0 };
        imageMap[imgId].nets.push(c.net);
        imageMap[imgId].count++;
      });

      const topImages = Object.entries(imageMap)
        .map(([, v]) => ({
          image_url: v.url,
          image_description: v.desc,
          caption_count: v.count,
          avg_net: v.nets.length ? v.nets.reduce((a, b) => a + b, 0) / v.nets.length : 0,
        }))
        .sort((a, b) => b.avg_net - a.avg_net)
        .slice(0, 8);

      setStats({
        totalCaptions: captions?.length ?? 0,
        totalVotes: votes?.length ?? 0,
        totalUpvotes: totalUp,
        totalDownvotes: totalDown,
        avgVotesPerCaption: Math.round(avgVotes * 10) / 10,
        avgNetScore: Math.round(avgNet * 10) / 10,
        positivityRate: votes?.length ? Math.round((totalUp / (votes.length)) * 100) : 0,
        captionsWithNoVotes: noVotes,
        captionsWithVotes: withVotes.length,
        topFunniest: [...captionStats].sort((a, b) => b.net - a.net).slice(0, 10),
        mostControversial: [...captionStats].sort((a, b) => b.controversy_score - a.controversy_score).slice(0, 10),
        mostVoted: [...captionStats].sort((a, b) => b.total_votes - a.total_votes).slice(0, 10),
        worstRated: [...captionStats].sort((a, b) => a.net - b.net).slice(0, 10),
        ratingDistribution,
        dailyVotes: last14,
        topImages,
      });
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'rankings', label: 'Rankings' },
    { key: 'images', label: 'Images' },
    { key: 'trends', label: 'Trends' },
  ] as const;

  if (loading) return (
    <AdminShell active="caption-stats">
      <div style={{ color: '#555', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.82rem' }}>Crunching numbers...</div>
    </AdminShell>
  );

  const maxDaily = Math.max(...(stats?.dailyVotes.map(d => d.votes) ?? [1]), 1);
  const maxDist = Math.max(...(stats?.ratingDistribution.map(d => d.count) ?? [1]), 1);

  return (
    <AdminShell active="caption-stats">
      {/* Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 600, color: '#fff', marginBottom: '0.25rem', fontFamily: "'IBM Plex Mono', monospace" }}>Caption Statistics</h1>
          <p style={{ fontSize: '0.78rem', color: '#555', fontFamily: "'IBM Plex Mono', monospace" }}>Detailed analytics on caption performance and user voting</p>
        </div>
        <button onClick={fetchStats} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#555', padding: '0.4rem 0.875rem', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', cursor: 'pointer' }}>
          ↻ refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.75rem', borderBottom: '1px solid #1e1e1e', paddingBottom: '0' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            background: 'transparent', border: 'none', padding: '0.5rem 1rem',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', cursor: 'pointer',
            color: activeTab === t.key ? '#fff' : '#444',
            borderBottom: activeTab === t.key ? '2px solid #febc2e' : '2px solid transparent',
            marginBottom: -1, transition: 'color 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* KPI grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {[
              { label: 'Public Captions', value: stats?.totalCaptions, color: '#f472b6', sub: `${stats?.captionsWithVotes} have votes` },
              { label: 'Total Votes Cast', value: stats?.totalVotes, color: '#60a5fa', sub: `${stats?.avgVotesPerCaption} avg per caption` },
              { label: 'Positivity Rate', value: `${stats?.positivityRate}%`, color: '#4ade80', sub: `${stats?.totalUpvotes} up / ${stats?.totalDownvotes} down` },
              { label: 'Avg Net Score', value: (stats?.avgNetScore ?? 0) >= 0 ? `+${stats?.avgNetScore}` : `${stats?.avgNetScore}`, color: '#febc2e', sub: 'across voted captions' },
            ].map(s => (
              <Card key={s.label}>
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.68rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', fontFamily: "'IBM Plex Mono', monospace" }}>{s.label}</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: s.color, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1 }}>{s.value?.toLocaleString()}</div>
                  <div style={{ fontSize: '0.68rem', color: '#444', marginTop: '0.4rem', fontFamily: "'IBM Plex Mono', monospace" }}>{s.sub}</div>
                </div>
              </Card>
            ))}
          </div>

          {/* Rating distribution */}
          <Card>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #1e1e1e' }}>
              <SectionHeader title="Rating Distribution" subtitle="Captions grouped by net score" />
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {stats?.ratingDistribution.map(r => (
                <div key={r.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#888', fontFamily: "'IBM Plex Mono', monospace" }}>{r.label}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: r.color, fontFamily: "'IBM Plex Mono', monospace" }}>{r.count}</span>
                  </div>
                  <Bar value={r.count} max={maxDist} color={r.color} />
                </div>
              ))}
            </div>
          </Card>

          {/* Quick stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Card>
              <div style={{ padding: '1.25rem' }}>
                <SectionHeader title="Vote Breakdown" />
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1, textAlign: 'center', padding: '1rem', background: '#0d1f0d', borderRadius: 6, border: '1px solid #1a3a1a' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4ade80', fontFamily: "'IBM Plex Mono', monospace" }}>{stats?.totalUpvotes?.toLocaleString()}</div>
                    <div style={{ fontSize: '0.68rem', color: '#2d5a2d', fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>↑ upvotes</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: '1rem', background: '#1f0d0d', borderRadius: 6, border: '1px solid #3a1a1a' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f87171', fontFamily: "'IBM Plex Mono', monospace" }}>{stats?.totalDownvotes?.toLocaleString()}</div>
                    <div style={{ fontSize: '0.68rem', color: '#5a2d2d', fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>↓ downvotes</div>
                  </div>
                </div>
              </div>
            </Card>
            <Card>
              <div style={{ padding: '1.25rem' }}>
                <SectionHeader title="Caption Coverage" />
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1, textAlign: 'center', padding: '1rem', background: '#0d1525', borderRadius: 6, border: '1px solid #1a2d4a' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#60a5fa', fontFamily: "'IBM Plex Mono', monospace" }}>{stats?.captionsWithVotes}</div>
                    <div style={{ fontSize: '0.68rem', color: '#2a4a6a', fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>have votes</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: '1rem', background: '#151515', borderRadius: 6, border: '1px solid #2a2a2a' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#444', fontFamily: "'IBM Plex Mono', monospace" }}>{stats?.captionsWithNoVotes}</div>
                    <div style={{ fontSize: '0.68rem', color: '#333', fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>no votes yet</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── RANKINGS ── */}
      {activeTab === 'rankings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Top funniest */}
            <Card>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#febc2e' }}>★</span>
                <SectionHeader title="Highest Rated" subtitle="by net score" />
              </div>
              {stats?.topFunniest.slice(0, 5).map((item, idx) => (
                <CaptionRow key={item.caption_id} item={item} idx={idx}
                  scoreLabel="net score" scoreColor="#4ade80"
                  scoreValue={item.net >= 0 ? `+${item.net}` : `${item.net}`} />
              ))}
            </Card>

            {/* Worst rated */}
            <Card>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#f87171' }}>✗</span>
                <SectionHeader title="Lowest Rated" subtitle="by net score" />
              </div>
              {stats?.worstRated.slice(0, 5).map((item, idx) => (
                <CaptionRow key={item.caption_id} item={item} idx={idx}
                  scoreLabel="net score" scoreColor="#f87171"
                  scoreValue={item.net >= 0 ? `+${item.net}` : `${item.net}`} />
              ))}
            </Card>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Most voted */}
            <Card>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#60a5fa' }}>◎</span>
                <SectionHeader title="Most Voted" subtitle="highest engagement" />
              </div>
              {stats?.mostVoted.slice(0, 5).map((item, idx) => (
                <CaptionRow key={item.caption_id} item={item} idx={idx}
                  scoreLabel="total votes" scoreColor="#60a5fa"
                  scoreValue={`${item.total_votes}`} />
              ))}
            </Card>

            {/* Most controversial */}
            <Card>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#f472b6' }}>⚡</span>
                <SectionHeader title="Most Controversial" subtitle="evenly split votes" />
              </div>
              {stats?.mostControversial.slice(0, 5).map((item, idx) => (
                <CaptionRow key={item.caption_id} item={item} idx={idx}
                  scoreLabel="controversy" scoreColor="#f472b6"
                  scoreValue={item.controversy_score.toFixed(2)} />
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* ── IMAGES ── */}
      {activeTab === 'images' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #1e1e1e' }}>
              <SectionHeader title="Top Images by Caption Performance" subtitle="ranked by average net score of their captions" />
            </div>
            {stats?.topImages.map((img, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.25rem', borderBottom: idx < (stats.topImages.length - 1) ? '1px solid #1a1a1a' : 'none' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: idx === 0 ? '#febc2e' : '#2a2a2a', fontFamily: "'IBM Plex Mono', monospace", width: 20, textAlign: 'center', flexShrink: 0 }}>{idx + 1}</div>
                {img.image_url && (
                  <img src={img.image_url} alt="" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 4, flexShrink: 0, border: '1px solid #2a2a2a' }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.75rem', color: '#888', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'IBM Plex Mono', monospace" }}>{img.image_description || 'No description'}</p>
                  <Pill color="#60a5fa">{img.caption_count} caption{img.caption_count !== 1 ? 's' : ''}</Pill>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.68rem', color: '#444', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 2 }}>avg net</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: img.avg_net >= 0 ? '#4ade80' : '#f87171', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {img.avg_net >= 0 ? '+' : ''}{img.avg_net.toFixed(1)}
                  </div>
                </div>
              </div>
            ))}
            {(!stats?.topImages || stats.topImages.length === 0) && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#333', fontSize: '0.78rem', fontFamily: "'IBM Plex Mono', monospace" }}>No image data yet</div>
            )}
          </Card>
        </div>
      )}

      {/* ── TRENDS ── */}
      {activeTab === 'trends' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #1e1e1e' }}>
              <SectionHeader title="Daily Voting Activity" subtitle="last 14 days" />
            </div>
            <div style={{ padding: '1.25rem' }}>
              {/* Simple bar chart */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: 120, marginBottom: '0.75rem' }}>
                {stats?.dailyVotes.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <div style={{ width: '100%', height: Math.max(2, (d.upvotes / maxDaily) * 100), background: '#4ade8066', borderRadius: '2px 2px 0 0', minHeight: d.upvotes > 0 ? 2 : 0 }} />
                      <div style={{ width: '100%', height: Math.max(2, (d.downvotes / maxDaily) * 100), background: '#f8717166', borderRadius: '0 0 2px 2px', minHeight: d.downvotes > 0 ? 2 : 0 }} />
                    </div>
                  </div>
                ))}
              </div>
              {/* X axis labels */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {stats?.dailyVotes.map((d, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '0.55rem', color: '#333', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {i % 2 === 0 ? d.date.slice(5) : ''}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, background: '#4ade8066', borderRadius: 2 }} /><span style={{ fontSize: '0.68rem', color: '#555', fontFamily: "'IBM Plex Mono', monospace" }}>upvotes</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, background: '#f8717166', borderRadius: 2 }} /><span style={{ fontSize: '0.68rem', color: '#555', fontFamily: "'IBM Plex Mono', monospace" }}>downvotes</span></div>
              </div>
            </div>
          </Card>

          {/* Daily table */}
          <Card>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #1e1e1e' }}>
              <SectionHeader title="Daily Breakdown" subtitle="votes per day detail" />
            </div>
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '0.5rem 1.25rem', borderBottom: '1px solid #1e1e1e' }}>
                {['Date', 'Total', 'Up', 'Down'].map(h => (
                  <div key={h} style={{ fontSize: '0.65rem', color: '#333', fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
                ))}
              </div>
              {[...( stats?.dailyVotes ?? [])].reverse().map((d, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '0.6rem 1.25rem', borderBottom: i < 13 ? '1px solid #141414' : 'none', background: i % 2 === 0 ? 'transparent' : '#0a0a0a' }}>
                  <div style={{ fontSize: '0.75rem', color: '#666', fontFamily: "'IBM Plex Mono', monospace" }}>{d.date}</div>
                  <div style={{ fontSize: '0.75rem', color: '#888', fontFamily: "'IBM Plex Mono', monospace" }}>{d.votes}</div>
                  <div style={{ fontSize: '0.75rem', color: '#4ade80', fontFamily: "'IBM Plex Mono', monospace" }}>↑{d.upvotes}</div>
                  <div style={{ fontSize: '0.75rem', color: '#f87171', fontFamily: "'IBM Plex Mono', monospace" }}>↓{d.downvotes}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </AdminShell>
  );
}