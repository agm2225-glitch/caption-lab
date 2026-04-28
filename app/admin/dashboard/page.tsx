'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminShell from '../AdminShell';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

const BLUE   = '#378ADD';
const GREEN  = '#639922';
const AMBER  = '#BA7517';
const CORAL  = '#D85A30';
const GRAY   = '#888780';
const BLUE_L = '#B5D4F480';

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
  peakHour: number;
  peakHourCount: number;
  maxVotesOnCaption: number;
  topFunniest: CaptionStat[];
  mostControversial: CaptionStat[];
  mostVoted: CaptionStat[];
  worstRated: CaptionStat[];
  ratingDistribution: { label: string; count: number; color: string }[];
  hourBuckets: number[];
  hourUps: number[];
  hourDowns: number[];
  dowBuckets: number[];
  dowUps: number[];
  dowDowns: number[];
  last30Dates: string[];
  last30Ups: number[];
  last30Downs: number[];
  distLabels: string[];
  distCounts: number[];
  posRateByHour: (number | null)[];
  topImages: { image_url: string; image_description: string; caption_count: number; avg_net: number }[];
}

const fmt12 = (h: number) => h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;

const Pill = ({ children, color }: { children: React.ReactNode; color: string }) => (
  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: '0.68rem', fontFamily: "'IBM Plex Mono', monospace", background: color + '22', color, border: `1px solid ${color}44` }}>
    {children}
  </span>
);

const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div style={{ marginBottom: '1rem' }}>
    <h2 style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e0e0e0', fontFamily: "'IBM Plex Mono', monospace", margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{title}</h2>
    {subtitle && <p style={{ fontSize: '0.7rem', color: '#444', margin: '0.25rem 0 0', fontFamily: "'IBM Plex Mono', monospace" }}>{subtitle}</p>}
  </div>
);

const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, overflow: 'hidden', ...style }}>
    {children}
  </div>
);

const CardHead = ({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: string }) => (
  <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
    {icon && <span style={{ fontSize: '13px' }}>{icon}</span>}
    <SectionHeader title={title} subtitle={subtitle} />
  </div>
);

const KpiCard = ({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) => (
  <Card>
    <div style={{ padding: '1.25rem' }}>
      <div style={{ fontSize: '0.68rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', fontFamily: "'IBM Plex Mono', monospace" }}>{label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 700, color, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1 }}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div style={{ fontSize: '0.68rem', color: '#444', marginTop: '0.4rem', fontFamily: "'IBM Plex Mono', monospace" }}>{sub}</div>
    </div>
  </Card>
);

const Legend = ({ items }: { items: { color: string; label: string }[] }) => (
  <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
    {items.map(i => (
      <div key={i.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: '#888', fontFamily: "'IBM Plex Mono', monospace" }}>
        <div style={{ width: 10, height: 10, borderRadius: 2, background: i.color }} />
        {i.label}
      </div>
    ))}
  </div>
);

const CaptionRow = ({ item, idx, scoreLabel, scoreColor, scoreValue }: {
  item: CaptionStat; idx: number; scoreLabel: string; scoreColor: string; scoreValue: string;
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.25rem', borderBottom: idx < 4 ? '1px solid #1a1a1a' : 'none' }}>
    <div style={{ fontSize: '1rem', fontWeight: 700, color: idx === 0 ? '#febc2e' : '#2a2a2a', fontFamily: "'IBM Plex Mono', monospace", width: 20, textAlign: 'center', flexShrink: 0 }}>{idx + 1}</div>
    {item.image_url && <img src={item.image_url} alt="" style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 4, flexShrink: 0, border: '1px solid #2a2a2a' }} />}
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: '0.78rem', color: '#ccc', fontStyle: 'italic', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'IBM Plex Mono', monospace" }}>"{item.content}"</p>
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

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { font: { size: 11 }, color: GRAY }, grid: { display: false } },
    y: { ticks: { font: { size: 11 }, color: GRAY }, grid: { color: 'rgba(128,128,128,0.1)' } },
  },
};

const stackedScales = {
  x: { stacked: true, ticks: { font: { size: 11 }, color: GRAY }, grid: { display: false } },
  y: { stacked: true, ticks: { font: { size: 11 }, color: GRAY }, grid: { color: 'rgba(128,128,128,0.1)' } },
};

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
      const [{ data: votes }, { data: captions }] = await Promise.all([
        supabase.from('caption_votes').select('caption_id, vote_value, created_at').limit(100000),
        supabase.from('captions').select('id, content, image_id, is_public, created_at, images(id, url, image_description)').eq('is_public', true).limit(100000),
      ]);

      // ── Vote map ─────────────────────────────────────────────────────────
      const voteMap: Record<string, { up: number; down: number }> = {};
      let totalUp = 0, totalDown = 0;
      const hourBuckets = Array(24).fill(0);
      const hourUps    = Array(24).fill(0);
      const hourDowns  = Array(24).fill(0);
      const dowBuckets = Array(7).fill(0);
      const dowUps     = Array(7).fill(0);
      const last30: Record<string, { u: number; d: number }> = {};
      const captionVoteCounts: Record<string, number> = {};

      votes?.forEach(v => {
        if (!voteMap[v.caption_id]) voteMap[v.caption_id] = { up: 0, down: 0 };
        if (v.vote_value > 0) { voteMap[v.caption_id].up += v.vote_value; totalUp += v.vote_value; }
        else { voteMap[v.caption_id].down += Math.abs(v.vote_value); totalDown += Math.abs(v.vote_value); }

        if (v.created_at) {
          const d = new Date(v.created_at);
          const h = d.getHours();
          const dow = d.getDay();
          const dateStr = d.toISOString().split('T')[0];
          hourBuckets[h]++;
          if (v.vote_value > 0) hourUps[h]++; else hourDowns[h]++;
          dowBuckets[dow]++;
          if (v.vote_value > 0) dowUps[dow]++;
          const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
          if (diff < 30) {
            if (!last30[dateStr]) last30[dateStr] = { u: 0, d: 0 };
            if (v.vote_value > 0) last30[dateStr].u++; else last30[dateStr].d++;
          }
        }
        captionVoteCounts[v.caption_id] = (captionVoteCounts[v.caption_id] || 0) + 1;
      });

      // ── Caption stats ────────────────────────────────────────────────────
      const captionStats: CaptionStat[] = (captions || []).map((c: any) => {
        const v = voteMap[c.id] || { up: 0, down: 0 };
        const total = v.up + v.down;
        const net = v.up - v.down;
        const controversy = total > 0 ? (Math.min(v.up, v.down) / Math.max(v.up, v.down, 1)) * Math.log(total + 1) : 0;
        return {
          caption_id: c.id, content: c.content,
          image_url: c.images?.url ?? '',
          image_description: c.images?.image_description ?? '',
          upvotes: v.up, downvotes: v.down, net, total_votes: total,
          controversy_score: controversy, created_at: c.created_at,
        };
      });

      const withVotes = captionStats.filter(c => c.total_votes > 0);
      const noVotes   = captionStats.filter(c => c.total_votes === 0).length;
      const avgNet    = withVotes.length ? withVotes.reduce((a, b) => a + b.net, 0) / withVotes.length : 0;
      const avgVotes  = captionStats.length ? (votes?.length ?? 0) / captionStats.length : 0;
      const peakHour  = hourBuckets.indexOf(Math.max(...hourBuckets));
      const votesPerCaption = Object.values(captionVoteCounts);
      const maxVPC = votesPerCaption.length ? Math.max(...votesPerCaption) : 0;

      // ── Rating distribution ──────────────────────────────────────────────
      const ratingDistribution = [
        { label: 'Loved (net ≥ 10)',    min: 10,       max: Infinity, color: '#4ade80' },
        { label: 'Liked (net 1–9)',     min: 1,        max: 9,        color: '#86efac' },
        { label: 'Mixed (net 0)',       min: 0,        max: 0,        color: '#facc15' },
        { label: 'Disliked (net −1–−9)',min: -9,       max: -1,       color: '#fb923c' },
        { label: 'Hated (net ≤ −10)',   min: -Infinity,max: -10,      color: '#f87171' },
      ].map(b => ({ label: b.label, color: b.color, count: withVotes.filter(c => c.net >= b.min && c.net <= b.max).length }));

      // ── Last 30 days ─────────────────────────────────────────────────────
      const last30dates: string[] = [];
      const d = new Date(); d.setDate(d.getDate() - 29);
      for (let i = 0; i < 30; i++) {
        last30dates.push(d.toISOString().split('T')[0]);
        d.setDate(d.getDate() + 1);
      }
      const last30Ups   = last30dates.map(dt => last30[dt]?.u ?? 0);
      const last30Downs = last30dates.map(dt => last30[dt]?.d ?? 0);

      // ── Votes per caption distribution ───────────────────────────────────
      const distMap: Record<string, number> = { '1': 0, '2–5': 0, '6–10': 0, '11–20': 0, '20+': 0 };
      votesPerCaption.forEach(n => {
        if (n === 1) distMap['1']++;
        else if (n <= 5)  distMap['2–5']++;
        else if (n <= 10) distMap['6–10']++;
        else if (n <= 20) distMap['11–20']++;
        else              distMap['20+']++;
      });

      // ── Positivity rate by hour ──────────────────────────────────────────
      const posRateByHour = hourUps.map((u, i) =>
        hourBuckets[i] > 0 ? Math.round((u / hourBuckets[i]) * 100) : null
      );

      // ── Top images ───────────────────────────────────────────────────────
      const imageMap: Record<string, { url: string; desc: string; nets: number[]; count: number }> = {};
      captionStats.forEach(c => {
        const cap = (captions || []).find((x: any) => x.id === c.caption_id);
        const imgId = cap?.image_id;
        if (!imgId) return;
        if (!imageMap[imgId]) imageMap[imgId] = { url: c.image_url, desc: c.image_description, nets: [], count: 0 };
        imageMap[imgId].nets.push(c.net);
        imageMap[imgId].count++;
      });
      const topImages = Object.values(imageMap)
        .map(v => ({ image_url: v.url, image_description: v.desc, caption_count: v.count, avg_net: v.nets.length ? v.nets.reduce((a, b) => a + b, 0) / v.nets.length : 0 }))
        .sort((a, b) => b.avg_net - a.avg_net).slice(0, 8);

      setStats({
        totalCaptions: captions?.length ?? 0,
        totalVotes: votes?.length ?? 0,
        totalUpvotes: totalUp,
        totalDownvotes: totalDown,
        avgVotesPerCaption: Math.round(avgVotes * 10) / 10,
        avgNetScore: Math.round(avgNet * 10) / 10,
        positivityRate: votes?.length ? Math.round((totalUp / votes.length) * 100) : 0,
        captionsWithNoVotes: noVotes,
        captionsWithVotes: withVotes.length,
        peakHour,
        peakHourCount: hourBuckets[peakHour],
        maxVotesOnCaption: maxVPC,
        topFunniest:      [...captionStats].sort((a, b) => b.net - a.net).slice(0, 10),
        mostControversial:[...captionStats].sort((a, b) => b.controversy_score - a.controversy_score).slice(0, 10),
        mostVoted:        [...captionStats].sort((a, b) => b.total_votes - a.total_votes).slice(0, 10),
        worstRated:       [...captionStats].sort((a, b) => a.net - b.net).slice(0, 10),
        ratingDistribution,
        hourBuckets, hourUps, hourDowns,
        dowBuckets,
        dowUps,
        dowDowns: dowBuckets.map((t, i) => t - dowUps[i]),
        last30Dates: last30dates,
        last30Ups, last30Downs,
        distLabels: Object.keys(distMap),
        distCounts: Object.values(distMap),
        posRateByHour,
        topImages,
      });
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'overview',  label: 'Overview' },
    { key: 'rankings',  label: 'Rankings' },
    { key: 'images',    label: 'Images' },
    { key: 'trends',    label: 'Trends' },
  ] as const;

  if (loading) return (
    <AdminShell active="caption-stats">
      <div style={{ color: '#555', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.82rem' }}>Crunching numbers...</div>
    </AdminShell>
  );

  const hourLabels = Array.from({ length: 24 }, (_, i) => fmt12(i));
  const dowLabels  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const maxDist    = Math.max(...(stats?.ratingDistribution.map(d => d.count) ?? [1]), 1);

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
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.75rem', borderBottom: '1px solid #1e1e1e' }}>
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
      {activeTab === 'overview' && stats && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <KpiCard label="Public Captions"  value={stats.totalCaptions}    color="#f472b6" sub={`${stats.captionsWithVotes} have votes`} />
            <KpiCard label="Total Votes Cast"  value={stats.totalVotes}       color={BLUE}    sub={`${stats.avgVotesPerCaption} avg per caption`} />
            <KpiCard label="Positivity Rate"   value={`${stats.positivityRate}%`} color={GREEN} sub={`${stats.totalUpvotes.toLocaleString()} up / ${stats.totalDownvotes.toLocaleString()} down`} />
            <KpiCard label="Peak Hour"         value={fmt12(stats.peakHour)}  color={AMBER}   sub={`${stats.peakHourCount.toLocaleString()} votes that hour`} />
          </div>

          {/* Hour + DoW charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Card>
              <CardHead title="Votes by hour of day" />
              <div style={{ padding: '1rem 1.25rem' }}>
                <Legend items={[{ color: BLUE, label: 'Upvotes' }, { color: CORAL, label: 'Downvotes' }]} />
                <div style={{ height: 180 }}>
                  <Bar
                    data={{ labels: hourLabels, datasets: [
                      { label: 'Upvotes',   data: stats.hourUps,   backgroundColor: BLUE,  stack: 'v', borderRadius: 2 },
                      { label: 'Downvotes', data: stats.hourDowns, backgroundColor: CORAL, stack: 'v', borderRadius: 2 },
                    ]}}
                    options={{ ...chartDefaults, scales: { ...stackedScales, x: { ...stackedScales.x, ticks: { ...stackedScales.x.ticks, autoSkip: true, maxTicksLimit: 8 } } } } as any}
                  />
                </div>
              </div>
            </Card>

            <Card>
              <CardHead title="Votes by day of week" />
              <div style={{ padding: '1rem 1.25rem' }}>
                <Legend items={[{ color: BLUE, label: 'Upvotes' }, { color: CORAL, label: 'Downvotes' }]} />
                <div style={{ height: 180 }}>
                  <Bar
                    data={{ labels: dowLabels, datasets: [
                      { label: 'Upvotes',   data: stats.dowUps,   backgroundColor: BLUE,  stack: 'v', borderRadius: 2 },
                      { label: 'Downvotes', data: stats.dowDowns, backgroundColor: CORAL, stack: 'v', borderRadius: 2 },
                    ]}}
                    options={{ ...chartDefaults, scales: stackedScales } as any}
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Positivity by hour */}
          <Card>
            <CardHead title="Positivity rate by hour" subtitle="% of votes that are upvotes" />
            <div style={{ padding: '1rem 1.25rem' }}>
              <Legend items={[{ color: AMBER, label: '% upvotes' }]} />
              <div style={{ height: 140 }}>
                <Line
                  data={{ labels: hourLabels, datasets: [{
                    label: '% upvotes', data: stats.posRateByHour,
                    borderColor: AMBER, backgroundColor: BLUE_L,
                    fill: true, tension: 0.4, pointRadius: 3,
                    pointBackgroundColor: AMBER, spanGaps: true,
                  }]}}
                  options={{ ...chartDefaults, scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, min: 0, max: 100, ticks: { ...chartDefaults.scales.y.ticks, callback: (v: any) => v + '%' } } }, plugins: { legend: { display: false } } } as any}
                />
              </div>
            </div>
          </Card>

          {/* Rating distribution + up/down split */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Card>
              <CardHead title="Rating distribution" subtitle="captions grouped by net score" />
              <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {stats.ratingDistribution.map(r => (
                  <div key={r.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#888', fontFamily: "'IBM Plex Mono', monospace" }}>{r.label}</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: r.color, fontFamily: "'IBM Plex Mono', monospace" }}>{r.count}</span>
                    </div>
                    <div style={{ height: 4, background: '#1e1e1e', borderRadius: 2, overflow: 'hidden', marginTop: 6 }}>
                      <div style={{ height: '100%', width: `${Math.max(2, (r.count / maxDist) * 100)}%`, background: r.color, borderRadius: 2, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHead title="Up vs down split" />
              <div style={{ padding: '1rem 1.25rem' }}>
                <Legend items={[{ color: GREEN, label: `Upvotes ${stats.positivityRate}%` }, { color: CORAL, label: `Downvotes ${100 - stats.positivityRate}%` }]} />
                <div style={{ height: 180 }}>
                  <Doughnut
                    data={{ labels: ['Upvotes', 'Downvotes'], datasets: [{ data: [stats.totalUpvotes, stats.totalDownvotes], backgroundColor: [GREEN, CORAL], borderWidth: 0 }] }}
                    options={{ responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } }}
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Votes per caption distribution */}
          <Card>
            <CardHead title="Votes per caption distribution" subtitle="how many captions fall into each engagement bucket" />
            <div style={{ padding: '1rem 1.25rem' }}>
              <Legend items={[{ color: BLUE, label: 'Caption count' }]} />
              <div style={{ height: 160 }}>
                <Bar
                  data={{ labels: stats.distLabels, datasets: [{ label: 'Captions', data: stats.distCounts, backgroundColor: BLUE, borderRadius: 3 }] }}
                  options={chartDefaults as any}
                />
              </div>
            </div>
          </Card>

          {/* Caption coverage */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Card>
              <CardHead title="Vote breakdown" />
              <div style={{ padding: '1rem 1.25rem', display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, textAlign: 'center', padding: '1rem', background: '#0d1f0d', borderRadius: 6, border: '1px solid #1a3a1a' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4ade80', fontFamily: "'IBM Plex Mono', monospace" }}>{stats.totalUpvotes.toLocaleString()}</div>
                  <div style={{ fontSize: '0.68rem', color: '#2d5a2d', fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>↑ upvotes</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: '1rem', background: '#1f0d0d', borderRadius: 6, border: '1px solid #3a1a1a' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f87171', fontFamily: "'IBM Plex Mono', monospace" }}>{stats.totalDownvotes.toLocaleString()}</div>
                  <div style={{ fontSize: '0.68rem', color: '#5a2d2d', fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>↓ downvotes</div>
                </div>
              </div>
            </Card>
            <Card>
              <CardHead title="Caption coverage" />
              <div style={{ padding: '1rem 1.25rem', display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, textAlign: 'center', padding: '1rem', background: '#0d1525', borderRadius: 6, border: '1px solid #1a2d4a' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: BLUE, fontFamily: "'IBM Plex Mono', monospace" }}>{stats.captionsWithVotes}</div>
                  <div style={{ fontSize: '0.68rem', color: '#2a4a6a', fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>have votes</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: '1rem', background: '#151515', borderRadius: 6, border: '1px solid #2a2a2a' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#444', fontFamily: "'IBM Plex Mono', monospace" }}>{stats.captionsWithNoVotes}</div>
                  <div style={{ fontSize: '0.68rem', color: '#333', fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>no votes yet</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── RANKINGS ── */}
      {activeTab === 'rankings' && stats && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <Card>
              <CardHead title="Highest rated" subtitle="by net score" icon="★" />
              {stats.topFunniest.slice(0, 5).map((item, idx) => <CaptionRow key={item.caption_id} item={item} idx={idx} scoreLabel="net score" scoreColor="#4ade80" scoreValue={item.net >= 0 ? `+${item.net}` : `${item.net}`} />)}
            </Card>
            <Card>
              <CardHead title="Lowest rated" subtitle="by net score" icon="✗" />
              {stats.worstRated.slice(0, 5).map((item, idx) => <CaptionRow key={item.caption_id} item={item} idx={idx} scoreLabel="net score" scoreColor="#f87171" scoreValue={item.net >= 0 ? `+${item.net}` : `${item.net}`} />)}
            </Card>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <Card>
              <CardHead title="Most voted" subtitle="highest engagement" icon="◎" />
              {stats.mostVoted.slice(0, 5).map((item, idx) => <CaptionRow key={item.caption_id} item={item} idx={idx} scoreLabel="total votes" scoreColor={BLUE} scoreValue={`${item.total_votes}`} />)}
            </Card>
            <Card>
              <CardHead title="Most controversial" subtitle="evenly split votes" icon="⚡" />
              {stats.mostControversial.slice(0, 5).map((item, idx) => <CaptionRow key={item.caption_id} item={item} idx={idx} scoreLabel="controversy" scoreColor="#f472b6" scoreValue={item.controversy_score.toFixed(2)} />)}
            </Card>
          </div>
        </div>
      )}

      {/* ── IMAGES ── */}
      {activeTab === 'images' && stats && (
        <Card>
          <CardHead title="Top images by caption performance" subtitle="ranked by average net score of their captions" />
          {stats.topImages.map((img, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.25rem', borderBottom: idx < stats.topImages.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: idx === 0 ? '#febc2e' : '#2a2a2a', fontFamily: "'IBM Plex Mono', monospace", width: 20, textAlign: 'center', flexShrink: 0 }}>{idx + 1}</div>
              {img.image_url && <img src={img.image_url} alt="" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 4, flexShrink: 0, border: '1px solid #2a2a2a' }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.75rem', color: '#888', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'IBM Plex Mono', monospace" }}>{img.image_description || 'No description'}</p>
                <Pill color={BLUE}>{img.caption_count} caption{img.caption_count !== 1 ? 's' : ''}</Pill>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '0.68rem', color: '#444', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 2 }}>avg net</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: img.avg_net >= 0 ? '#4ade80' : '#f87171', fontFamily: "'IBM Plex Mono', monospace" }}>
                  {img.avg_net >= 0 ? '+' : ''}{img.avg_net.toFixed(1)}
                </div>
              </div>
            </div>
          ))}
          {stats.topImages.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#333', fontSize: '0.78rem', fontFamily: "'IBM Plex Mono', monospace" }}>No image data yet</div>
          )}
        </Card>
      )}

      {/* ── TRENDS ── */}
      {activeTab === 'trends' && stats && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card>
            <CardHead title="Daily vote activity" subtitle="last 30 days" />
            <div style={{ padding: '1rem 1.25rem' }}>
              <Legend items={[{ color: BLUE, label: 'Upvotes' }, { color: CORAL, label: 'Downvotes' }]} />
              <div style={{ height: 180 }}>
                <Bar
                  data={{ labels: stats.last30Dates.map(d => d.slice(5)), datasets: [
                    { label: 'Upvotes',   data: stats.last30Ups,   backgroundColor: BLUE,  stack: 'v' },
                    { label: 'Downvotes', data: stats.last30Downs, backgroundColor: CORAL, stack: 'v' },
                  ]}}
                  options={{ ...chartDefaults, scales: { ...stackedScales, x: { ...stackedScales.x, ticks: { ...stackedScales.x.ticks, autoSkip: true, maxTicksLimit: 10 } } } } as any}
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHead title="Daily breakdown" subtitle="votes per day detail" />
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '0.5rem 1.25rem', borderBottom: '1px solid #1e1e1e' }}>
                {['Date', 'Total', 'Up', 'Down'].map(h => (
                  <div key={h} style={{ fontSize: '0.65rem', color: '#333', fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
                ))}
              </div>
              {[...stats.last30Dates].reverse().map((date, i) => {
                const u = stats.last30Ups[29 - i] ?? 0;
                const d = stats.last30Downs[29 - i] ?? 0;
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '0.6rem 1.25rem', borderBottom: i < 29 ? '1px solid #141414' : 'none', background: i % 2 === 0 ? 'transparent' : '#0a0a0a' }}>
                    <div style={{ fontSize: '0.75rem', color: '#666', fontFamily: "'IBM Plex Mono', monospace" }}>{date}</div>
                    <div style={{ fontSize: '0.75rem', color: '#888', fontFamily: "'IBM Plex Mono', monospace" }}>{u + d}</div>
                    <div style={{ fontSize: '0.75rem', color: '#4ade80', fontFamily: "'IBM Plex Mono', monospace" }}>↑{u}</div>
                    <div style={{ fontSize: '0.75rem', color: '#f87171', fontFamily: "'IBM Plex Mono', monospace" }}>↓{d}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </AdminShell>
  );
}