'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminShell from '../AdminShell';

const BLUE  = '#378ADD';
const GREEN = '#639922';
const AMBER = '#BA7517';
const CORAL = '#D85A30';
const GRAY  = '#888780';

const fmt12 = (h: number) => h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;

interface Stats {
  totalVotes: number;
  totalUpvotes: number;
  totalDownvotes: number;
  positivityRate: number;
  peakHour: number;
  peakHourCount: number;
  uniqueCaptions: number;
  avgVotesPerCaption: number;
  maxVotesOnCaption: number;
  hourUps: number[];
  hourDowns: number[];
  dowUps: number[];
  dowDowns: number[];
  last30Dates: string[];
  last30Ups: number[];
  last30Downs: number[];
  distLabels: string[];
  distCounts: number[];
  posRateByHour: (number | null)[];
}

const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, overflow: 'hidden', ...style }}>
    {children}
  </div>
);

const CardHead = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid #1e1e1e' }}>
    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e0e0e0', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.05em', textTransform: 'uppercase' }}>{title}</div>
    {subtitle && <div style={{ fontSize: '0.68rem', color: '#444', marginTop: 3, fontFamily: "'IBM Plex Mono', monospace" }}>{subtitle}</div>}
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

const ChartLegend = ({ items }: { items: { color: string; label: string }[] }) => (
  <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
    {items.map(i => (
      <div key={i.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: '#888', fontFamily: "'IBM Plex Mono', monospace" }}>
        <div style={{ width: 10, height: 10, borderRadius: 2, background: i.color }} />
        {i.label}
      </div>
    ))}
  </div>
);

function useChart(
  ref: React.RefObject<HTMLCanvasElement>,
  type: string,
  getData: () => any,
  getOptions: () => any,
  deps: any[]
) {
  useEffect(() => {
    if (!ref.current) return;
    let chart: any;
    import('chart.js/auto').then(({ default: Chart }) => {
      if (!ref.current) return;
      chart = new Chart(ref.current, { type, data: getData(), options: getOptions() } as any);
    });
    return () => { chart?.destroy(); };
  }, deps);
}

export default function CaptionStats() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends'>('overview');

  const refHour    = useRef<HTMLCanvasElement>(null);
  const refDow     = useRef<HTMLCanvasElement>(null);
  const refPosRate = useRef<HTMLCanvasElement>(null);
  const refSplit   = useRef<HTMLCanvasElement>(null);
  const refDist    = useRef<HTMLCanvasElement>(null);
  const refDaily   = useRef<HTMLCanvasElement>(null);

  const scaleStacked = {
    x: { stacked: true, ticks: { font: { size: 11 }, color: GRAY, autoSkip: true, maxTicksLimit: 8 }, grid: { display: false } },
    y: { stacked: true, ticks: { font: { size: 11 }, color: GRAY }, grid: { color: 'rgba(128,128,128,0.1)' } },
  };
  const scaleBase = {
    x: { ticks: { font: { size: 11 }, color: GRAY }, grid: { display: false } },
    y: { ticks: { font: { size: 11 }, color: GRAY }, grid: { color: 'rgba(128,128,128,0.1)' } },
  };
  const baseOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

  const hourLabels = Array.from({ length: 24 }, (_, i) => fmt12(i));
  const dowLabels  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useChart(refHour, 'bar',
    () => ({ labels: hourLabels, datasets: [
      { label: 'Upvotes',   data: stats?.hourUps   ?? [], backgroundColor: BLUE,  stack: 'v', borderRadius: 2 },
      { label: 'Downvotes', data: stats?.hourDowns  ?? [], backgroundColor: CORAL, stack: 'v', borderRadius: 2 },
    ]}),
    () => ({ ...baseOpts, scales: scaleStacked }),
    [stats?.hourUps, activeTab]
  );

  useChart(refDow, 'bar',
    () => ({ labels: dowLabels, datasets: [
      { label: 'Upvotes',   data: stats?.dowUps   ?? [], backgroundColor: BLUE,  stack: 'v', borderRadius: 2 },
      { label: 'Downvotes', data: stats?.dowDowns  ?? [], backgroundColor: CORAL, stack: 'v', borderRadius: 2 },
    ]}),
    () => ({ ...baseOpts, scales: scaleStacked }),
    [stats?.dowUps, activeTab]
  );

  useChart(refPosRate, 'line',
    () => ({ labels: hourLabels, datasets: [{
      label: '% upvotes', data: stats?.posRateByHour ?? [],
      borderColor: AMBER, backgroundColor: AMBER + '22',
      fill: true, tension: 0.4, pointRadius: 3,
      pointBackgroundColor: AMBER, spanGaps: true,
    }]}),
    () => ({ ...baseOpts, scales: { ...scaleBase, y: { ...scaleBase.y, min: 0, max: 100, ticks: { ...scaleBase.y.ticks, callback: (v: any) => v + '%' } } } }),
    [stats?.posRateByHour, activeTab]
  );

  useChart(refSplit, 'doughnut',
    () => ({ labels: ['Upvotes', 'Downvotes'], datasets: [{
      data: [stats?.totalUpvotes ?? 0, stats?.totalDownvotes ?? 0],
      backgroundColor: [GREEN, CORAL], borderWidth: 0,
    }]}),
    () => ({ ...baseOpts, cutout: '68%' }),
    [stats?.totalUpvotes, activeTab]
  );

  useChart(refDist, 'bar',
    () => ({ labels: stats?.distLabels ?? [], datasets: [{
      label: 'Captions', data: stats?.distCounts ?? [],
      backgroundColor: BLUE, borderRadius: 3,
    }]}),
    () => ({ ...baseOpts, scales: scaleBase }),
    [stats?.distCounts, activeTab]
  );

  useChart(refDaily, 'bar',
    () => ({ labels: stats?.last30Dates.map(d => d.slice(5)) ?? [], datasets: [
      { label: 'Upvotes',   data: stats?.last30Ups   ?? [], backgroundColor: BLUE,  stack: 'v' },
      { label: 'Downvotes', data: stats?.last30Downs  ?? [], backgroundColor: CORAL, stack: 'v' },
    ]}),
    () => ({ ...baseOpts, scales: { ...scaleStacked, x: { ...scaleStacked.x, maxTicksLimit: 10 } } }),
    [stats?.last30Ups, activeTab]
  );

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
      const { data: votes } = await supabase
        .from('caption_votes')
        .select('caption_id, vote_value, created_at')
        .limit(100000);

      if (!votes) return;

      let totalUp = 0, totalDown = 0;
      const hourBuckets = Array(24).fill(0);
      const hourUps     = Array(24).fill(0);
      const hourDowns   = Array(24).fill(0);
      const dowBuckets  = Array(7).fill(0);
      const dowUps      = Array(7).fill(0);
      const last30: Record<string, { u: number; d: number }> = {};
      const captionVoteCounts: Record<string, number> = {};

      votes.forEach(v => {
        if (v.vote_value > 0) totalUp += v.vote_value;
        else totalDown += Math.abs(v.vote_value);

        if (v.created_at) {
          const d   = new Date(v.created_at);
          const h   = d.getHours();
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

      const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));
      const votesPerCaption = Object.values(captionVoteCounts);
      const avgVPC = votesPerCaption.length
        ? Math.round((votesPerCaption.reduce((a, b) => a + b, 0) / votesPerCaption.length) * 10) / 10
        : 0;

      const last30dates: string[] = [];
      const cursor = new Date(); cursor.setDate(cursor.getDate() - 29);
      for (let i = 0; i < 30; i++) {
        last30dates.push(cursor.toISOString().split('T')[0]);
        cursor.setDate(cursor.getDate() + 1);
      }

      const distMap: Record<string, number> = { '1': 0, '2–5': 0, '6–10': 0, '11–20': 0, '20+': 0 };
      votesPerCaption.forEach(n => {
        if (n === 1)       distMap['1']++;
        else if (n <= 5)   distMap['2–5']++;
        else if (n <= 10)  distMap['6–10']++;
        else if (n <= 20)  distMap['11–20']++;
        else               distMap['20+']++;
      });

      setStats({
        totalVotes: votes.length,
        totalUpvotes: totalUp,
        totalDownvotes: totalDown,
        positivityRate: votes.length ? Math.round((totalUp / votes.length) * 100) : 0,
        peakHour,
        peakHourCount: hourBuckets[peakHour],
        uniqueCaptions: votesPerCaption.length,
        avgVotesPerCaption: avgVPC,
        maxVotesOnCaption: votesPerCaption.length ? Math.max(...votesPerCaption) : 0,
        hourUps, hourDowns,
        dowUps,
        dowDowns: dowBuckets.map((t, i) => t - dowUps[i]),
        last30Dates: last30dates,
        last30Ups:   last30dates.map(dt => last30[dt]?.u ?? 0),
        last30Downs: last30dates.map(dt => last30[dt]?.d ?? 0),
        distLabels: Object.keys(distMap),
        distCounts: Object.values(distMap),
        posRateByHour: hourUps.map((u, i) =>
          hourBuckets[i] > 0 ? Math.round((u / hourBuckets[i]) * 100) : null
        ),
      });
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'trends',   label: 'Trends'   },
  ] as const;

  if (loading) return (
    <AdminShell active="caption-stats">
      <div style={{ color: '#555', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.82rem' }}>Crunching numbers...</div>
    </AdminShell>
  );

  return (
    <AdminShell active="caption-stats">

      {/* Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 600, color: '#fff', marginBottom: '0.25rem', fontFamily: "'IBM Plex Mono', monospace" }}>Caption Statistics</h1>
          <p style={{ fontSize: '0.78rem', color: '#555', fontFamily: "'IBM Plex Mono', monospace" }}>Vote analytics from caption_votes</p>
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
            <KpiCard label="Total Votes"        value={stats.totalVotes}            color={BLUE}  sub={`${stats.totalUpvotes.toLocaleString()} up · ${stats.totalDownvotes.toLocaleString()} down`} />
            <KpiCard label="Positivity Rate"    value={`${stats.positivityRate}%`}  color={GREEN} sub="upvotes / total votes" />
            <KpiCard label="Peak Hour"          value={fmt12(stats.peakHour)}       color={AMBER} sub={`${stats.peakHourCount.toLocaleString()} votes that hour`} />
            <KpiCard label="Captions Voted On"  value={stats.uniqueCaptions}        color="#f472b6" sub={`${stats.avgVotesPerCaption} avg · ${stats.maxVotesOnCaption} max`} />
          </div>

          {/* Hour + DoW */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Card>
              <CardHead title="Votes by hour of day" />
              <div style={{ padding: '1rem 1.25rem' }}>
                <ChartLegend items={[{ color: BLUE, label: 'Upvotes' }, { color: CORAL, label: 'Downvotes' }]} />
                <div style={{ position: 'relative', height: 180 }}>
                  <canvas ref={refHour} role="img" aria-label="Votes by hour of day" />
                </div>
              </div>
            </Card>
            <Card>
              <CardHead title="Votes by day of week" />
              <div style={{ padding: '1rem 1.25rem' }}>
                <ChartLegend items={[{ color: BLUE, label: 'Upvotes' }, { color: CORAL, label: 'Downvotes' }]} />
                <div style={{ position: 'relative', height: 180 }}>
                  <canvas ref={refDow} role="img" aria-label="Votes by day of week" />
                </div>
              </div>
            </Card>
          </div>

          {/* Positivity by hour */}
          <Card>
            <CardHead title="Positivity rate by hour" subtitle="% of votes that are upvotes" />
            <div style={{ padding: '1rem 1.25rem' }}>
              <ChartLegend items={[{ color: AMBER, label: '% upvotes' }]} />
              <div style={{ position: 'relative', height: 140 }}>
                <canvas ref={refPosRate} role="img" aria-label="Positivity rate by hour" />
              </div>
            </div>
          </Card>

          {/* Split + distribution */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Card>
              <CardHead title="Up vs down split" />
              <div style={{ padding: '1rem 1.25rem' }}>
                <ChartLegend items={[{ color: GREEN, label: `Upvotes ${stats.positivityRate}%` }, { color: CORAL, label: `Downvotes ${100 - stats.positivityRate}%` }]} />
                <div style={{ position: 'relative', height: 180 }}>
                  <canvas ref={refSplit} role="img" aria-label="Up vs down doughnut chart" />
                </div>
              </div>
            </Card>
            <Card>
              <CardHead title="Votes per caption distribution" subtitle="engagement spread across captions" />
              <div style={{ padding: '1rem 1.25rem' }}>
                <ChartLegend items={[{ color: BLUE, label: 'Caption count' }]} />
                <div style={{ position: 'relative', height: 180 }}>
                  <canvas ref={refDist} role="img" aria-label="Votes per caption distribution" />
                </div>
              </div>
            </Card>
          </div>

          {/* Vote breakdown boxes */}
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
              <CardHead title="Caption engagement" />
              <div style={{ padding: '1rem 1.25rem', display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, textAlign: 'center', padding: '1rem', background: '#0d1525', borderRadius: 6, border: '1px solid #1a2d4a' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: BLUE, fontFamily: "'IBM Plex Mono', monospace" }}>{stats.uniqueCaptions.toLocaleString()}</div>
                  <div style={{ fontSize: '0.68rem', color: '#2a4a6a', fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>captions voted on</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: '1rem', background: '#151515', borderRadius: 6, border: '1px solid #2a2a2a' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#888', fontFamily: "'IBM Plex Mono', monospace" }}>{stats.avgVotesPerCaption}</div>
                  <div style={{ fontSize: '0.68rem', color: '#444', fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>avg votes each</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── TRENDS ── */}
      {activeTab === 'trends' && stats && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card>
            <CardHead title="Daily vote activity" subtitle="last 30 days" />
            <div style={{ padding: '1rem 1.25rem' }}>
              <ChartLegend items={[{ color: BLUE, label: 'Upvotes' }, { color: CORAL, label: 'Downvotes' }]} />
              <div style={{ position: 'relative', height: 200 }}>
                <canvas ref={refDaily} role="img" aria-label="Daily vote activity last 30 days" />
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
                const u = stats.last30Ups[29 - i]   ?? 0;
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